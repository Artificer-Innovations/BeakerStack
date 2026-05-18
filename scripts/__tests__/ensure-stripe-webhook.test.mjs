import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ensureStripeWebhook,
  findStripeWebhookEndpointByUrl,
  isAutoEnsureStripeWebhookUrl,
  MissingWebhookSecretError,
  normalizeStripeWebhookUrl,
  stripeSecretKeyMatchesMode,
  STRIPE_WEBHOOK_ENABLED_EVENTS,
} from '../lib/ensure-stripe-webhook.mjs';

test('normalizeStripeWebhookUrl trims trailing slash', () => {
  assert.equal(
    normalizeStripeWebhookUrl(
      'https://abcd.supabase.co/functions/v1/stripe-webhook/'
    ),
    'https://abcd.supabase.co/functions/v1/stripe-webhook'
  );
});

test('isAutoEnsureStripeWebhookUrl accepts hosted supabase https webhook', () => {
  assert.ok(
    isAutoEnsureStripeWebhookUrl(
      'https://abcd1234.supabase.co/functions/v1/stripe-webhook'
    )
  );
});

test('isAutoEnsureStripeWebhookUrl rejects local docker', () => {
  assert.ok(
    !isAutoEnsureStripeWebhookUrl(
      'http://127.0.0.1:54321/functions/v1/stripe-webhook'
    )
  );
});

test('isAutoEnsureStripeWebhookUrl rejects custom hosts', () => {
  assert.ok(
    !isAutoEnsureStripeWebhookUrl(
      'https://api.example.com/functions/v1/stripe-webhook'
    )
  );
});

test('stripeSecretKeyMatchesMode', () => {
  assert.ok(stripeSecretKeyMatchesMode('sk_test_abc', 'test'));
  assert.ok(stripeSecretKeyMatchesMode('sk_live_abc', 'live'));
  assert.ok(!stripeSecretKeyMatchesMode('sk_live_abc', 'test'));
});

test('findStripeWebhookEndpointByUrl paginates past first page', async () => {
  const target = 'https://proj.supabase.co/functions/v1/stripe-webhook';
  const other = 'https://other.supabase.co/functions/v1/stripe-webhook';
  let call = 0;
  const mockStripe = {
    webhookEndpoints: {
      list: async ({ starting_after: after } = {}) => {
        call += 1;
        if (!after) {
          return {
            data: Array.from({ length: 100 }, (_, i) => ({
              id: `we_fill_${i}`,
              url: other,
            })),
            has_more: true,
          };
        }
        return {
          data: [{ id: 'we_target', url: target }],
          has_more: false,
        };
      },
    },
  };

  const found = await findStripeWebhookEndpointByUrl(mockStripe, target);
  assert.equal(found?.id, 'we_target');
  assert.equal(call, 2);
});

test('ensureStripeWebhook creates endpoint when missing', async () => {
  const calls = [];
  const mockStripe = {
    webhookEndpoints: {
      list: async () => ({ data: [] }),
      create: async params => {
        calls.push(['create', params]);
        return { id: 'we_123', secret: 'whsec_new' };
      },
      update: async () => {
        throw new Error('should not update');
      },
    },
  };

  const result = await ensureStripeWebhook({
    secretKey: 'sk_test_x',
    webhookUrl: 'https://proj.supabase.co/functions/v1/stripe-webhook',
    description: 'test',
    stripe: mockStripe,
  });

  assert.equal(result.signingSecret, 'whsec_new');
  assert.equal(result.created, true);
  assert.equal(result.endpointId, 'we_123');
  assert.deepEqual(calls[0][1].enabled_events, STRIPE_WEBHOOK_ENABLED_EVENTS);
});

test('ensureStripeWebhook reuses existing secret', async () => {
  const url = 'https://proj.supabase.co/functions/v1/stripe-webhook';
  const mockStripe = {
    webhookEndpoints: {
      list: async () => ({
        data: [
          {
            id: 'we_existing',
            url,
            enabled_events: [...STRIPE_WEBHOOK_ENABLED_EVENTS],
          },
        ],
      }),
      create: async () => {
        throw new Error('should not create');
      },
      update: async () => {
        throw new Error('should not update');
      },
    },
  };

  const result = await ensureStripeWebhook({
    secretKey: 'sk_test_x',
    webhookUrl: url,
    existingWebhookSecret: 'whsec_saved',
    stripe: mockStripe,
  });

  assert.equal(result.signingSecret, 'whsec_saved');
  assert.equal(result.created, false);
});

test('ensureStripeWebhook updates events and returns eventsUpdated: true', async () => {
  const url = 'https://proj.supabase.co/functions/v1/stripe-webhook';
  const updateCalls = [];
  const mockStripe = {
    webhookEndpoints: {
      list: async () => ({
        data: [
          {
            id: 'we_existing',
            url,
            enabled_events: ['checkout.session.completed'],
          },
        ],
      }),
      update: async (id, params) => {
        updateCalls.push([id, params]);
        return { id };
      },
      create: async () => {
        throw new Error('should not create');
      },
    },
  };

  const result = await ensureStripeWebhook({
    secretKey: 'sk_test_x',
    webhookUrl: url,
    existingWebhookSecret: 'whsec_saved',
    stripe: mockStripe,
  });

  assert.equal(result.eventsUpdated, true);
  assert.equal(result.signingSecret, 'whsec_saved');
  assert.equal(updateCalls.length, 1);
});

test('ensureStripeWebhook throws MissingWebhookSecretError when endpoint exists without secret', async () => {
  const url = 'https://proj.supabase.co/functions/v1/stripe-webhook';
  const mockStripe = {
    webhookEndpoints: {
      list: async () => ({
        data: [
          {
            id: 'we_existing',
            url,
            enabled_events: ['checkout.session.completed'],
          },
        ],
      }),
      update: async () => ({ id: 'we_existing' }),
      create: async () => {
        throw new Error('should not create');
      },
    },
  };

  await assert.rejects(
    () =>
      ensureStripeWebhook({
        secretKey: 'sk_test_x',
        webhookUrl: url,
        stripe: mockStripe,
      }),
    MissingWebhookSecretError
  );
});
