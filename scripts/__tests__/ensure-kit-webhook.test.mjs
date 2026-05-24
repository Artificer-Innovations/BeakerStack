import assert from 'node:assert/strict';
import test from 'node:test';

import {
  KIT_WEBHOOK_UNSUBSCRIBE_EVENT,
  createKitUnsubscribeWebhook,
  ensureKitWebhook,
  findKitWebhookByUrl,
  kitWebhookUrlFromSupabaseUrl,
  listKitWebhooks,
  normalizeKitWebhookUrl,
} from '../lib/ensure-kit-webhook.mjs';

test('normalizeKitWebhookUrl collapses duplicate slashes in path', () => {
  assert.equal(
    normalizeKitWebhookUrl('https://a.supabase.co//functions/v1/kit-webhook/'),
    'https://a.supabase.co/functions/v1/kit-webhook'
  );
});

test('kitWebhookUrlFromSupabaseUrl handles project host', () => {
  assert.equal(
    kitWebhookUrlFromSupabaseUrl('https://proj.supabase.co'),
    'https://proj.supabase.co/functions/v1/kit-webhook'
  );
});

test('ensureKitWebhook returns existing webhook without create', async () => {
  const target = 'https://proj.supabase.co/functions/v1/kit-webhook';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('/webhooks?') && (!init || init.method === 'GET')) {
      return new Response(
        JSON.stringify({
          webhooks: [
            {
              id: 42,
              target_url: target,
              event: { name: KIT_WEBHOOK_UNSUBSCRIBE_EVENT },
            },
          ],
          pagination: { has_next_page: false },
        }),
        { status: 200 }
      );
    }
    throw new Error(`unexpected fetch: ${u}`);
  };
  try {
    const result = await ensureKitWebhook({
      apiKey: 'test-key',
      webhookUrl: target,
    });
    assert.equal(result.created, false);
    assert.equal(result.webhookId, 42);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ensureKitWebhook creates webhook when missing', async () => {
  const target = 'https://proj.supabase.co/functions/v1/kit-webhook';
  let posted = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('/webhooks?') && (!init || init.method === 'GET')) {
      return new Response(
        JSON.stringify({ webhooks: [], pagination: { has_next_page: false } }),
        { status: 200 }
      );
    }
    if (u.endsWith('/webhooks') && init?.method === 'POST') {
      posted = true;
      const body = JSON.parse(String(init.body));
      assert.equal(body.target_url, target);
      assert.equal(body.event.name, KIT_WEBHOOK_UNSUBSCRIBE_EVENT);
      return new Response(
        JSON.stringify({ webhook: { id: 99, target_url: target } }),
        { status: 201 }
      );
    }
    throw new Error(`unexpected fetch: ${u}`);
  };
  try {
    const result = await ensureKitWebhook({
      apiKey: 'test-key',
      webhookUrl: target,
    });
    assert.equal(posted, true);
    assert.equal(result.created, true);
    assert.equal(result.webhookId, 99);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('listKitWebhooks paginates', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async url => {
    calls += 1;
    const u = String(url);
    if (u.includes('after=cursor1')) {
      return new Response(
        JSON.stringify({
          webhooks: [{ id: 2, target_url: 'https://b.example/webhook' }],
          pagination: { has_next_page: false },
        }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        webhooks: [{ id: 1, target_url: 'https://a.example/webhook' }],
        pagination: { has_next_page: true, end_cursor: 'cursor1' },
      }),
      { status: 200 }
    );
  };
  try {
    const hooks = await listKitWebhooks('key');
    assert.equal(hooks.length, 2);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('findKitWebhookByUrl matches normalized URL', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        webhooks: [
          {
            id: 7,
            target_url: 'https://x.supabase.co/functions/v1/kit-webhook/',
          },
        ],
        pagination: { has_next_page: false },
      }),
      { status: 200 }
    );
  try {
    const found = await findKitWebhookByUrl(
      'key',
      'https://x.supabase.co/functions/v1/kit-webhook'
    );
    assert.equal(found?.id, 7);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('createKitUnsubscribeWebhook posts expected body', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.method, 'POST');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.event.name, KIT_WEBHOOK_UNSUBSCRIBE_EVENT);
    return new Response(
      JSON.stringify({ webhook: { id: 3, target_url: body.target_url } }),
      { status: 201 }
    );
  };
  try {
    const wh = await createKitUnsubscribeWebhook(
      'key',
      'https://x.supabase.co/functions/v1/kit-webhook'
    );
    assert.equal(wh.id, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
