import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import {
  corsHeadersForWaitlist,
  jsonResponse,
} from '../_shared/waitlist-origins.ts';
import { enqueueMarketingEmail } from '../_shared/marketingEmailQueue.ts';

type Body = {
  action:
    | 'validate'
    | 'consume'
    | 'approve'
    | 'reject'
    | 'resend'
    | 'send_invite_email';
  entryId?: string;
  token?: string;
  userId?: string;
  userEmail?: string;
  inviteToken?: string;
  inviteUrl?: string;
  email?: string;
  subject?: string;
  html?: string;
  productId?: string;
};

function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

async function requireAdmin(
  req: Request,
  supabaseUrl: string,
  anonKey: string
) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser();
  if (userErr || !user) {
    return { error: jsonResponse({ error: 'unauthenticated' }, 401, req) };
  }

  const { data: isAdmin, error: adminErr } =
    await authClient.rpc('admin_is_admin');
  if (adminErr || !isAdmin) {
    return { error: jsonResponse({ error: 'not_found' }, 404, req) };
  }

  return { authClient, user };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersForWaitlist(req) });
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ?? Deno.env.get('BILLING_SUPABASE_URL');
  const anonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('BILLING_SUPABASE_ANON_KEY');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('BILLING_SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: 'server_misconfigured' }, 500, req);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400, req);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Marketing email product is always server-controlled — never caller-supplied.
  const envProductId = Deno.env.get('WAITLIST_PRODUCT_ID');
  if (!envProductId) {
    console.warn('WAITLIST_PRODUCT_ID is not set; defaulting to "beakerstack"');
  }
  const marketingProductId = envProductId || 'beakerstack';

  if (body.action === 'validate') {
    const token = body.token?.trim();
    if (!token) {
      return jsonResponse({ valid: false }, 200, req);
    }
    const { data, error } = await admin.rpc('waitlist_validate_invite', {
      p_token: token,
    });
    if (error) {
      return jsonResponse({ valid: false }, 200, req);
    }
    return jsonResponse(data, 200, req);
  }

  if (body.action === 'consume') {
    const token = body.token?.trim();
    const userId = body.userId;
    if (!token || !userId) {
      return jsonResponse({ error: 'invalid_request' }, 400, req);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return jsonResponse({ error: 'unauthenticated' }, 401, req);
    }

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
    if (user.id !== userId) {
      return jsonResponse({ error: 'forbidden' }, 403, req);
    }

    const { data, error } = await authClient.rpc('waitlist_consume_invite', {
      p_token: token,
      p_user_id: userId,
      p_user_email: body.userEmail ?? user.email ?? null,
    });
    if (error) {
      return jsonResponse({ error: error.message }, 400, req);
    }

    const consumeResult = data as {
      ok?: boolean;
      error?: string;
      already_converted?: boolean;
      default_plan_id?: string;
    };
    if (consumeResult?.error) {
      return jsonResponse({ error: consumeResult.error }, 400, req);
    }

    if (consumeResult.ok && !consumeResult.already_converted) {
      if (consumeResult.default_plan_id) {
        // Billing productId may be caller-supplied (admin choosing product for billing).
        const billingProductId =
          body.productId?.trim() ||
          Deno.env.get('WAITLIST_PRODUCT_ID') ||
          'beakerstack';
        const { error: planErr } = await admin.rpc(
          'billing_ensure_subscription_plan',
          {
            p_product_id: billingProductId,
            p_plan_id: consumeResult.default_plan_id,
            p_user_id: userId,
          }
        );
        if (planErr) {
          console.error('billing_ensure_subscription_plan', planErr.message);
          return jsonResponse({ error: 'plan_provision_failed' }, 500, req);
        }
      }

      // Use the JWT-verified email only — never the caller-supplied userEmail,
      // which could route the Kit event to an arbitrary address.
      const consumeEmail = user.email?.toLowerCase().trim() ?? null;
      if (consumeEmail) {
        await enqueueMarketingEmail(
          admin,
          marketingProductId,
          'waitlist.converted',
          consumeEmail,
          { user_id: userId },
          `waitlist.converted:${userId}`
        );
      }
    }

    return jsonResponse(data, 200, req);
  }

  const auth = await requireAdmin(req, supabaseUrl, anonKey);
  if ('error' in auth && auth.error) return auth.error;
  const { authClient } = auth as {
    authClient: ReturnType<typeof createClient>;
  };

  if (body.action === 'approve') {
    if (!body.entryId) {
      return jsonResponse({ error: 'invalid_request' }, 400, req);
    }

    // Use authClient (carries admin JWT) — admin_get_waitlist_entry checks
    // auth.uid() + admin_is_admin() internally, so the service-role client
    // would return { error: 'not_found' } because auth.uid() is NULL.
    const { data: entryData, error: entryErr } = await authClient.rpc(
      'admin_get_waitlist_entry',
      { p_id: body.entryId }
    );
    if (entryErr) {
      console.error('admin_get_waitlist_entry error', entryErr.message);
    }
    const entryEmail = (
      entryData as { email?: string; metadata?: Record<string, unknown> } | null
    )?.email;
    const entryPlanId = (
      entryData as { metadata?: { plan_id?: string } } | null
    )?.metadata?.plan_id;

    const { data, error } = await authClient.rpc(
      'admin_approve_waitlist_entry',
      {
        p_id: body.entryId,
      }
    );
    if (error) {
      return jsonResponse({ error: error.message }, 400, req);
    }

    if (entryEmail) {
      const approvePayload: Record<string, unknown> = {
        entry_id: body.entryId,
      };
      if (entryPlanId) approvePayload.plan_id = entryPlanId;
      await enqueueMarketingEmail(
        admin,
        marketingProductId,
        'waitlist.approved',
        entryEmail,
        approvePayload,
        `waitlist.approved:${body.entryId}`
      );
    }

    return jsonResponse(data, 200, req);
  }

  if (body.action === 'reject') {
    if (!body.entryId) {
      return jsonResponse({ error: 'invalid_request' }, 400, req);
    }
    const { data, error } = await authClient.rpc(
      'admin_reject_waitlist_entry',
      {
        p_id: body.entryId,
      }
    );
    if (error) {
      return jsonResponse({ error: error.message }, 400, req);
    }
    return jsonResponse(data, 200, req);
  }

  if (body.action === 'resend') {
    if (!body.entryId) {
      return jsonResponse({ error: 'invalid_request' }, 400, req);
    }
    const { data, error } = await authClient.rpc(
      'admin_resend_waitlist_invite',
      {
        p_id: body.entryId,
      }
    );
    if (error) {
      return jsonResponse({ error: error.message }, 400, req);
    }
    return jsonResponse(data, 200, req);
  }

  if (body.action === 'send_invite_email') {
    const to = body.email?.trim();
    const inviteUrl = body.inviteUrl?.trim();
    if (!to || !inviteUrl) {
      return jsonResponse({ error: 'invalid_request' }, 400, req);
    }

    if (body.entryId) {
      const { data: entryRow, error: entryErr } = await authClient.rpc(
        'admin_get_waitlist_entry',
        { p_id: body.entryId }
      );
      if (entryErr || (entryRow as { error?: string })?.error) {
        return jsonResponse({ error: 'not_found' }, 404, req);
      }
      const entryEmail = (entryRow as { email?: string }).email;
      if (!entryEmail || entryEmail.toLowerCase() !== to.toLowerCase()) {
        return jsonResponse({ error: 'email_mismatch' }, 400, req);
      }
    }

    const subject =
      body.subject ??
      Deno.env.get('WAITLIST_INVITE_SUBJECT') ??
      'You are invited to sign up';
    const htmlTemplate =
      body.html ??
      Deno.env.get('WAITLIST_INVITE_HTML') ??
      '<p>Complete your signup: <a href="{{inviteUrl}}">{{inviteUrl}}</a></p>';
    const html = renderTemplate(htmlTemplate, { inviteUrl });

    const resendKey = Deno.env.get('WAITLIST_RESEND_API_KEY');
    if (!resendKey) {
      console.log(
        `[beakerstack/email] waitlist invite (log only) to=${to} subject=${subject}\n${html}`
      );
      return jsonResponse({ error: 'email_not_configured' }, 501, req);
    }

    const from =
      Deno.env.get('WAITLIST_INVITE_FROM') ?? 'onboarding@resend.dev';
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });
    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error('resend send failed', resendRes.status, detail);
      return jsonResponse({ error: 'email_send_failed' }, 502, req);
    }

    return jsonResponse({ ok: true }, 200, req);
  }

  return jsonResponse({ error: 'unknown_action' }, 400, req);
});
