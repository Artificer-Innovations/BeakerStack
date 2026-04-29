import Stripe from 'npm:stripe@14.21.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeadersForRequest, jsonResponse } from '../_shared/cors.ts';
import { getBillingDeployTarget } from '../_shared/billing-deploy-target.ts';

type ProcessResult =
  | { status: 'processed' }
  | { status: 'ignored'; reason: string };

/** Postgrest errors are plain objects; throwing them logs as `[object Object]`. */
function asErrorFromSupabase(error: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}): Error {
  const parts = [
    error.code,
    error.message ?? 'supabase_error',
    error.details,
    error.hint,
  ].filter((p): p is string => Boolean(p && String(p).trim()));
  return new Error(parts.join(' | '));
}

function formatCaught(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    const o = e as {
      message: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    return [o.code, o.message, o.details, o.hint].filter(Boolean).join(' | ');
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

void Deno.env.get('STRIPE_PUBLISHABLE_KEY');

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

/** Stripe webhook payloads may omit or type-shift timestamps; never throw from Date. */
function stripeUnixToIso(seconds: unknown): string | null {
  if (seconds == null) return null;
  const n = typeof seconds === 'number' ? seconds : Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function extractSubscriptionPeriod(stripeSub: Stripe.Subscription): {
  periodStart: string | null;
  periodEnd: string | null;
} {
  const subAny = stripeSub as unknown as Record<string, unknown>;
  const items =
    (subAny.items as { data?: Array<Record<string, unknown>> } | undefined)
      ?.data ?? [];
  const firstItem = items[0];

  const periodStart =
    stripeUnixToIso(subAny.current_period_start) ??
    stripeUnixToIso(firstItem?.current_period_start) ??
    stripeUnixToIso(subAny.start_date);

  const periodEnd =
    stripeUnixToIso(subAny.current_period_end) ??
    stripeUnixToIso(firstItem?.current_period_end) ??
    stripeUnixToIso(subAny.cancel_at);

  return { periodStart, periodEnd };
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'canceled':
    case 'unpaid':
      return status;
    case 'incomplete':
    case 'incomplete_expired':
      return status === 'incomplete_expired' ? 'canceled' : 'incomplete';
    default:
      return 'active';
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersForRequest(req) });
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ?? Deno.env.get('BILLING_SUPABASE_URL');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('BILLING_SUPABASE_SERVICE_ROLE_KEY');

  if (!webhookSecret || !supabaseUrl || !serviceKey) {
    console.error(
      'Missing STRIPE_WEBHOOK_SECRET and Supabase URL/service key (SUPABASE_* or BILLING_SUPABASE_*)'
    );
    return jsonResponse({ error: 'server_misconfigured' }, 500, req);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    // Deno / Edge uses async SubtleCrypto; synchronous constructEvent throws.
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature ?? '',
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return jsonResponse({ error: 'invalid_signature' }, 400, req);
  }

  const { error: logErr } = await supabase
    .from('billing_webhook_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      processed: false,
    });

  if (logErr) {
    if (logErr.code === '23505') {
      // If this event failed previously (processed=false), allow reprocessing on resend.
      const { data: existing } = await supabase
        .from('billing_webhook_events')
        .select('processed')
        .eq('stripe_event_id', event.id)
        .maybeSingle();
      if (existing?.processed) {
        return jsonResponse({ received: true, duplicate: true }, 200, req);
      }
      console.warn('Retrying previously failed webhook event', event.id);
    } else {
      console.error('Failed to log webhook', formatCaught(logErr));
      return jsonResponse({ error: 'log_failed' }, 500, req);
    }
  }

  try {
    const result = await processStripeEvent(supabase, event);
    if (result.status === 'ignored') {
      await supabase
        .from('billing_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error: `ignored: ${result.reason}`,
        })
        .eq('stripe_event_id', event.id);
      return jsonResponse({ received: true, ignored: true }, 200, req);
    }
    await supabase
      .from('billing_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error: null,
      })
      .eq('stripe_event_id', event.id);
  } catch (e) {
    const msg = formatCaught(e);
    console.error('Webhook processing error', msg);
    await supabase
      .from('billing_webhook_events')
      .update({ processed: false, error: msg })
      .eq('stripe_event_id', event.id);
    return jsonResponse({ error: 'processing_failed' }, 500, req);
  }

  return jsonResponse({ received: true }, 200, req);
});

async function processStripeEvent(
  supabase: ReturnType<typeof createClient>,
  event: Stripe.Event
): Promise<ProcessResult> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const expectedTarget = getBillingDeployTarget();
      const metaTarget = session.metadata?.billing_deploy_target?.trim();
      if (
        metaTarget !== undefined &&
        metaTarget !== '' &&
        metaTarget !== expectedTarget
      ) {
        console.warn(
          'checkout.session.completed ignored: billing_deploy_target mismatch',
          { sessionId: session.id, expected: expectedTarget, got: metaTarget }
        );
        return {
          status: 'ignored',
          reason: 'billing_deploy_target_mismatch',
        };
      }
      const userId = session.metadata?.supabase_user_id;
      const productId = session.metadata?.product_id;
      const planId = session.metadata?.plan_id;
      const subId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;
      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;
      if (!userId || !productId || !planId || !subId) {
        console.warn('checkout.session.completed missing metadata', session.id);
        return { status: 'processed' };
      }
      const stripeSub = await stripe.subscriptions.retrieve(subId);
      const { periodStart, periodEnd } = extractSubscriptionPeriod(stripeSub);
      const priceId = stripeSub.items.data[0]?.price?.id;
      const resolvedPlanId = await resolvePlanId(supabase, planId, priceId);
      const { error } = await supabase.from('billing_subscriptions').upsert(
        {
          user_id: userId,
          product_id: productId,
          plan_id: resolvedPlanId,
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subId,
          stripe_price_id: priceId ?? null,
          status: mapStripeStatus(stripeSub.status),
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: stripeSub.cancel_at_period_end,
          pending_target_plan_id: null,
          trial_start: stripeUnixToIso(stripeSub.trial_start),
          trial_end: stripeUnixToIso(stripeSub.trial_end),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id' }
      );
      if (error) throw asErrorFromSupabase(error);
      return { status: 'processed' };
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as Stripe.Subscription;
      const priceId = stripeSub.items.data[0]?.price?.id;
      const { data: row } = await supabase
        .from('billing_subscriptions')
        .select(
          'user_id, product_id, plan_id, current_period_start, current_period_end, pending_target_plan_id'
        )
        .eq('stripe_subscription_id', stripeSub.id)
        .maybeSingle();

      if (!row) {
        console.warn(
          'No local subscription for stripe subscription',
          stripeSub.id
        );
        return { status: 'processed' };
      }

      const resolvedPlanId = await resolvePlanId(
        supabase,
        row.plan_id,
        priceId
      );
      const { periodStart, periodEnd } = extractSubscriptionPeriod(stripeSub);
      const mappedStatus =
        event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : mapStripeStatus(stripeSub.status);
      const isCanceled = mappedStatus === 'canceled';
      const finalPlanId = isCanceled
        ? await resolveFreePlanId(supabase, row.product_id, row.plan_id)
        : resolvedPlanId;
      const finalStatus = isCanceled ? 'free' : mappedStatus;

      const cancelAtEnd = isCanceled ? false : stripeSub.cancel_at_period_end;
      const pendingTarget =
        isCanceled || !cancelAtEnd
          ? null
          : ((row as { pending_target_plan_id?: string | null })
              .pending_target_plan_id ?? null);

      const { error } = await supabase
        .from('billing_subscriptions')
        .update({
          plan_id: finalPlanId,
          status: finalStatus,
          stripe_subscription_id: isCanceled ? null : stripeSub.id,
          stripe_price_id: isCanceled ? null : (priceId ?? null),
          current_period_start: periodStart ?? row.current_period_start,
          current_period_end: periodEnd ?? row.current_period_end,
          cancel_at_period_end: cancelAtEnd,
          pending_target_plan_id: pendingTarget,
          canceled_at: stripeUnixToIso(stripeSub.canceled_at),
          trial_start: stripeUnixToIso(stripeSub.trial_start),
          trial_end: stripeUnixToIso(stripeSub.trial_end),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', stripeSub.id);
      if (error) throw asErrorFromSupabase(error);
      return { status: 'processed' };
    }
    case 'customer.subscription.trial_will_end': {
      // Product apps handle email; optionally touch row for observability
      return { status: 'processed' };
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = invoice.subscription;
      const subId = typeof subRef === 'string' ? subRef : subRef?.id;
      if (subId) {
        const { error } = await supabase
          .from('billing_subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId);
        if (error) throw asErrorFromSupabase(error);
      }
      await syncInvoiceRow(supabase, invoice);
      return { status: 'processed' };
    }
    case 'invoice.paid':
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = invoice.subscription;
      const subId = typeof subRef === 'string' ? subRef : subRef?.id;
      if (subId) {
        const { error } = await supabase
          .from('billing_subscriptions')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId);
        if (error) throw asErrorFromSupabase(error);
      }
      await syncInvoiceRow(supabase, invoice);
      return { status: 'processed' };
    }
    case 'invoice.created':
    case 'invoice.finalized':
    case 'invoice.voided': {
      const inv = event.data.object as Stripe.Invoice;
      await syncInvoiceRow(supabase, inv);
      return { status: 'processed' };
    }
    default:
      return { status: 'processed' };
  }
}

async function resolvePlanId(
  supabase: ReturnType<typeof createClient>,
  fallbackPlanId: string,
  stripePriceId: string | undefined
): Promise<string> {
  if (!stripePriceId) return fallbackPlanId;

  const { data: monthly } = await supabase
    .from('billing_plans')
    .select('id')
    .eq('stripe_price_id_monthly', stripePriceId)
    .maybeSingle();
  if (monthly?.id) return monthly.id;

  const { data: annual } = await supabase
    .from('billing_plans')
    .select('id')
    .eq('stripe_price_id_annual', stripePriceId)
    .maybeSingle();
  return annual?.id ?? fallbackPlanId;
}

function stripeCustomerIdString(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (typeof customer === 'string') return customer;
  if (customer && 'deleted' in customer && customer.deleted) return null;
  if (customer && 'id' in customer) return customer.id;
  return null;
}

async function resolveUserIdByStripeCustomer(
  supabase: ReturnType<typeof createClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('billing_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .maybeSingle();
  return data?.user_id ?? null;
}

function firstLineDescription(invoice: Stripe.Invoice): string | null {
  const first = invoice.lines?.data[0];
  if (!first) return invoice.description ?? null;
  return first.description ?? invoice.description ?? null;
}

async function syncInvoiceRow(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = stripeCustomerIdString(
    invoice.customer as Stripe.Invoice['customer']
  );
  if (!customerId) {
    console.warn('Invoice missing customer', invoice.id);
    return;
  }
  const userId = await resolveUserIdByStripeCustomer(supabase, customerId);
  if (!userId) {
    // Rare race: invoice before checkout links stripe_customer_id on our row.
    // Spec: log and reconcile on a later event — do not fail the webhook (REQ-046).
    console.warn(
      'syncInvoiceRow: no subscription row for customer yet; skipping invoice upsert',
      { customerId, invoiceId: invoice.id }
    );
    return;
  }

  const subRef = invoice.subscription;
  const subId = typeof subRef === 'string' ? subRef : (subRef?.id ?? null);
  const inv = invoice as unknown as Record<string, unknown>;
  const st = (inv['status_transitions'] ?? {}) as Record<string, number | null>;

  const paidAtSec = st['paid_at'] as number | null | undefined;
  const finAtSec = st['finalized_at'] as number | null | undefined;
  const createdSec =
    (inv['created'] as number | undefined) ?? Math.floor(Date.now() / 1000);

  const row = {
    user_id: userId,
    stripe_invoice_id: invoice.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subId,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    currency: (invoice.currency || 'usd').toLowerCase(),
    status: invoice.status ?? 'draft',
    description: firstLineDescription(invoice),
    hosted_invoice_url: invoice.hosted_invoice_url ?? null,
    invoice_pdf_url:
      (invoice as { invoice_pdf?: string | null }).invoice_pdf ?? null,
    period_start: invoice.period_start
      ? stripeUnixToIso(invoice.period_start)
      : null,
    period_end: invoice.period_end ? stripeUnixToIso(invoice.period_end) : null,
    created_at: stripeUnixToIso(createdSec) ?? new Date().toISOString(),
    finalized_at: finAtSec && finAtSec > 0 ? stripeUnixToIso(finAtSec) : null,
    paid_at: paidAtSec && paidAtSec > 0 ? stripeUnixToIso(paidAtSec) : null,
  };

  const { error } = await supabase.from('billing_invoices').upsert(row, {
    onConflict: 'stripe_invoice_id',
  });
  if (error) throw asErrorFromSupabase(error);
}

async function resolveFreePlanId(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  fallbackPlanId: string
): Promise<string> {
  const { data } = await supabase
    .from('billing_plans')
    .select('id')
    .eq('product_id', productId)
    .eq('price_cents', 0)
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? fallbackPlanId;
}
