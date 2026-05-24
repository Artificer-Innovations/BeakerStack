/**
 * Ensure Kit Creator API v4 webhooks exist for Supabase kit-webhook URLs.
 * Shared by CI (`ensure-kit-webhook-endpoint.mjs`) and setup:kit.
 */

const KIT_API_BASE = 'https://api.kit.com/v4';

/** Event handled by supabase/functions/kit-webhook/index.ts */
export const KIT_WEBHOOK_UNSUBSCRIBE_EVENT =
  'subscriber.subscriber_unsubscribe';

/**
 * @param {string} url
 * @returns {string}
 */
export function normalizeKitWebhookUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    u.pathname = u.pathname.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
    return u.toString().replace(/\/+$/, '');
  } catch {
    return raw.replace(/\/+$/, '');
  }
}

/**
 * @param {string} supabaseUrl
 * @returns {string}
 */
export function kitWebhookUrlFromSupabaseUrl(supabaseUrl) {
  const raw = normalizeKitWebhookUrl(supabaseUrl);
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    const hostMatch = u.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    if (hostMatch) {
      return `https://${hostMatch[1]}.supabase.co/functions/v1/kit-webhook`;
    }
    const path = u.pathname.replace(/\/+$/, '') || '';
    const webhookPath = '/functions/v1/kit-webhook';
    if (path.endsWith(webhookPath)) return `${u.origin}${path}`;
    if (path && path !== '/') return `${u.origin}${path}${webhookPath}`;
    return `${u.origin}${webhookPath}`;
  } catch {
    return '';
  }
}

/**
 * @param {string} apiKey
 * @param {string} path
 * @param {{ method?: string; body?: unknown }} [opts]
 * @param {number} [attempt]
 */
async function kitRequest(apiKey, path, opts = {}, attempt = 0) {
  const res = await fetch(`${KIT_API_BASE}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'X-Kit-Api-Key': apiKey,
      Accept: 'application/json',
      ...(opts.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    if (res.status === 429 && attempt < 2) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      return kitRequest(apiKey, path, opts, attempt + 1);
    }
    const text = await res.text().catch(() => '');
    throw new Error(
      `Kit API ${opts.method || 'GET'} ${path} → ${res.status}${text ? ` — ${text.slice(0, 200)}` : ''}`
    );
  }
  if (res.status === 204) return {};
  return res.json();
}

/**
 * @param {string} apiKey
 * @returns {Promise<Array<{ id: number; target_url: string; event?: { name?: string } }>>}
 */
export async function listKitWebhooks(apiKey) {
  /** @type {Array<{ id: number; target_url: string; event?: { name?: string } }>} */
  const all = [];
  let after;
  for (;;) {
    const qs = new URLSearchParams({ per_page: '100' });
    if (after) qs.set('after', after);
    const data = await kitRequest(apiKey, `/webhooks?${qs.toString()}`);
    const batch = Array.isArray(data.webhooks) ? data.webhooks : [];
    all.push(...batch);
    const pagination = data.pagination;
    if (!pagination?.has_next_page || !pagination?.end_cursor) break;
    after = pagination.end_cursor;
  }
  return all;
}

/**
 * @param {Array<{ id: number; target_url: string }>} webhooks
 * @param {string} targetUrl
 * @returns {{ id: number; target_url: string } | null}
 */
export function findKitWebhookByUrlInList(webhooks, targetUrl) {
  const normalized = normalizeKitWebhookUrl(targetUrl);
  if (!normalized) return null;
  return (
    webhooks.find(w => normalizeKitWebhookUrl(w.target_url) === normalized) ??
    null
  );
}

/**
 * @param {string} apiKey
 * @param {string} targetUrl
 * @returns {Promise<{ id: number; target_url: string } | null>}
 */
export async function findKitWebhookByUrl(apiKey, targetUrl) {
  const webhooks = await listKitWebhooks(apiKey);
  return findKitWebhookByUrlInList(webhooks, targetUrl);
}

/**
 * @param {string} apiKey
 * @param {string} targetUrl
 * @returns {Promise<{ id: number; target_url: string }>}
 */
export async function createKitUnsubscribeWebhook(apiKey, targetUrl) {
  const data = await kitRequest(apiKey, '/webhooks', {
    method: 'POST',
    body: {
      target_url: normalizeKitWebhookUrl(targetUrl),
      event: {
        name: KIT_WEBHOOK_UNSUBSCRIBE_EVENT,
        form_id: null,
        tag_id: null,
        sequence_id: null,
        product_id: null,
        initiator_value: null,
        custom_field_id: null,
      },
    },
  });
  const webhook = data.webhook;
  if (!webhook?.id) {
    throw new Error('Kit API did not return a webhook id after create');
  }
  return webhook;
}

/**
 * @param {{
 *   apiKey: string;
 *   webhookUrl: string;
 *   description?: string;
 *   webhooks?: Array<{ id: number; target_url: string }>;
 * }} opts
 * @returns {Promise<{ created: boolean; webhookId: number; targetUrl: string }>}
 */
export async function ensureKitWebhook(opts) {
  const apiKey = String(opts.apiKey || '').trim();
  const targetUrl = normalizeKitWebhookUrl(opts.webhookUrl);
  if (!apiKey) throw new Error('KIT_API_KEY is required');
  if (!targetUrl) throw new Error('KIT_WEBHOOK_URL is required');

  const webhooks = opts.webhooks ?? (await listKitWebhooks(apiKey));
  const existing = findKitWebhookByUrlInList(webhooks, targetUrl);
  if (existing) {
    return {
      created: false,
      webhookId: existing.id,
      targetUrl,
    };
  }

  const created = await createKitUnsubscribeWebhook(apiKey, targetUrl);
  return {
    created: true,
    webhookId: created.id,
    targetUrl,
  };
}
