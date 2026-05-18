import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import {
  corsHeadersForWaitlist,
  jsonResponse,
} from '../_shared/waitlist-origins.ts';

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
    const { data, error } = await authClient.rpc(
      'admin_approve_waitlist_entry',
      {
        p_id: body.entryId,
      }
    );
    if (error) {
      return jsonResponse({ error: error.message }, 400, req);
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
    const to = body.email;
    const inviteUrl = body.inviteUrl;
    if (!to || !inviteUrl) {
      return jsonResponse({ error: 'invalid_request' }, 400, req);
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

    console.log(
      `[beakerstack/email] waitlist invite to=${to} subject=${subject}\n${html}`
    );

    return jsonResponse({ ok: true }, 200, req);
  }

  return jsonResponse({ error: 'unknown_action' }, 400, req);
});
