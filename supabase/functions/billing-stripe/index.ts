import Stripe from 'npm:stripe@14.21.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import {
  assertRedirectUrlAllowed,
  RedirectValidationError,
} from '../_shared/billing-origins.ts';
import { getBillingDeployTarget } from '../_shared/billing-deploy-target.ts';
import { corsHeadersForRequest, jsonResponse } from '../_shared/cors.ts';

/** REQ-031: module reads publishable key from env (client UIs use it; Edge does not call Stripe with it). */
void Deno.env.get('STRIPE_PUBLISHABLE_KEY');

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

type Body = {
  action:
    | 'checkout'
    | 'portal'
    | 'schedule_cancel_to_free'
    | 'cancel_immediately'
    | 'update_subscription'
    | 'resume_subscription';
  productId?: string;
  planId?: string;
  /** Which Stripe recurring price to use; default monthly. */
  cadence?: 'monthly' | 'annual';
  successUrl?: string;
  cancelUrl?: string;
  returnUrl?: string;
  /** Optional; capped to plan's `trial_period_days` (REQ-015 / QA). */
  trialDays?: number;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersForRequest(req) });
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ?? Deno.env.get('BILLING_SUPABASE_URL');
  /** Hosted Edge injects `SUPABASE_ANON_KEY`; CI cannot set `SUPABASE_*` via CLI, so workflows set `BILLING_SUPABASE_ANON_KEY`. */
  const anonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('BILLING_SUPABASE_ANON_KEY');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('BILLING_SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: 'server_misconfigured' }, 500, req);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: 'unauthenticated' }, 401, req);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400, req);
  }

  try {
    switch (body.action) {
      case 'checkout':
        return await handleCheckout(
          admin,
          user.id,
          user.email ?? '',
          body,
          req
        );
      case 'portal':
        return await handlePortal(admin, user.id, body, req);
      case 'schedule_cancel_to_free':
        return await handleScheduleCancelToFree(admin, user.id, body, req);
      case 'cancel_immediately':
        return await handleCancel(admin, user.id, body, req);
      case 'resume_subscription':
        return await handleResumeSubscription(admin, user.id, body, req);
      case 'update_subscription':
        return await handleUpdateSubscription(admin, user.id, body, req);
      default:
        return jsonResponse({ error: 'unknown_action' }, 400, req);
    }
  } catch (e) {
    if (e instanceof RedirectValidationError) {
      return jsonResponse(
        {
          error: 'invalid_redirect_url',
          hint: 'Add the origin of successUrl/cancelUrl/returnUrl to BILLING_ALLOWED_ORIGINS (PR previews often need https://deploy.beakerstack.com). Trailing slashes in the secret are normalized for https URLs.',
        },
        400,
        req
      );
    }
    console.error(
      'billing-stripe',
      e instanceof Error ? (e.stack ?? e.message) : e
    );
    return jsonResponse({ error: 'stripe_error' }, 400, req);
  }
});

async function handleCheckout(
  admin: ReturnType<typeof createClient>,
  userId: string,
  email: string,
  body: Body,
  req: Request
): Promise<Response> {
  const {
    productId,
    planId,
    successUrl,
    cancelUrl,
    cadence = 'monthly',
    trialDays: trialDaysOverride,
  } = body;
  if (!productId || !planId || !successUrl || !cancelUrl) {
    return jsonResponse({ error: 'missing_fields' }, 400, req);
  }
  assertRedirectUrlAllowed(successUrl);
  assertRedirectUrlAllowed(cancelUrl);

  const { data: plan, error: planErr } = await admin
    .from('billing_plans')
    .select(
      'id, stripe_price_id_monthly, stripe_price_id_annual, price_cents, trial_period_days'
    )
    .eq('id', planId)
    .eq('product_id', productId)
    .maybeSingle();
  const priceId =
    cadence === 'annual'
      ? plan?.stripe_price_id_annual
      : plan?.stripe_price_id_monthly;
  if (planErr || !priceId) {
    return jsonResponse(
      {
        error: 'plan_not_checkout_ready',
        hint: 'Run sync-billing-stripe to set stripe_price_id_monthly / _annual for paid plans',
      },
      400,
      req
    );
  }

  const planTrialDays = Math.max(
    0,
    Math.floor(Number(plan?.trial_period_days ?? 0))
  );
  let effectiveTrialDays = planTrialDays;
  if (
    typeof trialDaysOverride === 'number' &&
    !Number.isNaN(trialDaysOverride)
  ) {
    const capped = Math.min(
      Math.max(0, Math.floor(trialDaysOverride)),
      planTrialDays
    );
    effectiveTrialDays = capped;
  }

  const deployTarget = getBillingDeployTarget();

  const subscriptionData: {
    metadata: Record<string, string>;
    trial_period_days?: number;
  } = {
    metadata: {
      supabase_user_id: userId,
      product_id: productId,
      plan_id: planId,
      billing_deploy_target: deployTarget,
    },
  };
  if (effectiveTrialDays > 0) {
    subscriptionData.trial_period_days = effectiveTrialDays;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      supabase_user_id: userId,
      product_id: productId,
      plan_id: planId,
      billing_deploy_target: deployTarget,
    },
    subscription_data: subscriptionData,
  });

  return jsonResponse(
    { checkoutUrl: session.url, sessionId: session.id },
    200,
    req
  );
}

async function handlePortal(
  admin: ReturnType<typeof createClient>,
  userId: string,
  body: Body,
  req: Request
): Promise<Response> {
  const returnUrl = body.returnUrl;
  if (!returnUrl) return jsonResponse({ error: 'missing_returnUrl' }, 400, req);
  const productId = body.productId;
  if (!productId) return jsonResponse({ error: 'missing_productId' }, 400, req);

  assertRedirectUrlAllowed(returnUrl);

  const { data: sub, error } = await admin
    .from('billing_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (error || !sub?.stripe_customer_id) {
    return jsonResponse({ error: 'no_stripe_customer' }, 400, req);
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: returnUrl,
  });
  return jsonResponse({ url: portal.url }, 200, req);
}

async function handleUpdateSubscription(
  admin: ReturnType<typeof createClient>,
  userId: string,
  body: Body,
  req: Request
): Promise<Response> {
  const { productId, planId, cadence = 'monthly' } = body;
  if (!productId || !planId) {
    return jsonResponse({ error: 'missing_fields' }, 400, req);
  }
  const { data: sub, error: subErr } = await admin
    .from('billing_subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (subErr || !sub?.stripe_subscription_id) {
    return jsonResponse({ error: 'no_active_subscription' }, 400, req);
  }
  const { data: plan, error: planErr } = await admin
    .from('billing_plans')
    .select('stripe_price_id_monthly, stripe_price_id_annual, price_cents')
    .eq('id', planId)
    .eq('product_id', productId)
    .maybeSingle();
  if (planErr || !plan) {
    return jsonResponse({ error: 'invalid_plan' }, 400, req);
  }
  const newPriceId =
    cadence === 'annual'
      ? plan.stripe_price_id_annual
      : plan.stripe_price_id_monthly;
  if (!newPriceId) {
    return jsonResponse({ error: 'plan_not_priced' }, 400, req);
  }
  const stripeSub = await stripe.subscriptions.retrieve(
    sub.stripe_subscription_id
  );
  const subItem = stripeSub.items.data[0];
  if (!subItem?.id) {
    return jsonResponse({ error: 'no_subscription_item' }, 400, req);
  }
  if (subItem.price?.id === newPriceId) {
    return jsonResponse({ ok: true, noOp: true }, 200, req);
  }
  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    items: [{ id: subItem.id, price: newPriceId }],
    proration_behavior: 'create_prorations',
  });
  return jsonResponse({ ok: true }, 200, req);
}

async function resolveFreePlanIdForProduct(
  admin: ReturnType<typeof createClient>,
  productId: string
): Promise<string | null> {
  const { data } = await admin
    .from('billing_plans')
    .select('id')
    .eq('product_id', productId)
    .eq('price_cents', 0)
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function handleScheduleCancelToFree(
  admin: ReturnType<typeof createClient>,
  userId: string,
  body: Body,
  req: Request
): Promise<Response> {
  const productId = body.productId;
  if (!productId) return jsonResponse({ error: 'missing_productId' }, 400, req);

  const { data: sub, error } = await admin
    .from('billing_subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (error || !sub?.stripe_subscription_id) {
    return jsonResponse({ error: 'no_active_subscription' }, 400, req);
  }

  const freePlanId = await resolveFreePlanIdForProduct(admin, productId);
  if (!freePlanId) {
    return jsonResponse({ error: 'no_free_plan' }, 400, req);
  }

  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  const { error: upErr } = await admin
    .from('billing_subscriptions')
    .update({
      cancel_at_period_end: true,
      pending_target_plan_id: freePlanId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (upErr) {
    console.error(
      'schedule_cancel_to_free: failed to set pending_target_plan_id',
      upErr
    );
    return jsonResponse({ error: 'db_update_failed' }, 500, req);
  }

  return jsonResponse({ ok: true }, 200, req);
}

async function handleResumeSubscription(
  admin: ReturnType<typeof createClient>,
  userId: string,
  body: Body,
  req: Request
): Promise<Response> {
  const productId = body.productId;
  if (!productId) return jsonResponse({ error: 'missing_productId' }, 400, req);

  const { data: sub, error } = await admin
    .from('billing_subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (error || !sub?.stripe_subscription_id) {
    return jsonResponse({ error: 'no_active_subscription' }, 400, req);
  }

  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  const { error: upErr } = await admin
    .from('billing_subscriptions')
    .update({
      cancel_at_period_end: false,
      pending_target_plan_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (upErr) {
    console.error('resume_subscription: failed to clear pending state', upErr);
    return jsonResponse({ error: 'db_update_failed' }, 500, req);
  }

  return jsonResponse({ ok: true }, 200, req);
}

async function handleCancel(
  admin: ReturnType<typeof createClient>,
  userId: string,
  body: Body,
  req: Request
): Promise<Response> {
  const productId = body.productId;
  if (!productId) return jsonResponse({ error: 'missing_productId' }, 400, req);

  const { data: sub, error } = await admin
    .from('billing_subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (error || !sub?.stripe_subscription_id) {
    return jsonResponse({ error: 'no_active_subscription' }, 400, req);
  }

  await stripe.subscriptions.cancel(sub.stripe_subscription_id);

  const { error: upErr } = await admin
    .from('billing_subscriptions')
    .update({
      pending_target_plan_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (upErr) {
    console.error(
      'cancel_immediately: failed to clear pending_target_plan_id',
      upErr
    );
  }

  return jsonResponse({ ok: true }, 200, req);
}
