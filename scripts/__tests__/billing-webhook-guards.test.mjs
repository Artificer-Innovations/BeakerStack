import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyStripeEventCore,
  deployTargetMismatch,
  redactedWebhookPayload,
  stripeSubscriptionIdFromRef,
} from '../../supabase/functions/_shared/billing-webhook-guards-core.mjs';

const EXPECTED = 'app_a_ref';

function stubSupabase(ownedBySubId = new Map(), productIds = ['app_a']) {
  return {
    ownedBySubId,
    productIds,
  };
}

function makeFindOwned(stub) {
  return async subId => {
    const row = stub.ownedBySubId.get(subId);
    return row ?? null;
  };
}

function allowedSet(stub) {
  return new Set(stub.productIds);
}

test('deployTargetMismatch: missing metadata is not a mismatch', () => {
  assert.equal(deployTargetMismatch({}, EXPECTED), false);
  assert.equal(deployTargetMismatch(undefined, EXPECTED), false);
});

test('deployTargetMismatch: present and equal is not a mismatch', () => {
  assert.equal(
    deployTargetMismatch({ billing_deploy_target: EXPECTED }, EXPECTED),
    false
  );
});

test('deployTargetMismatch: present and different is a mismatch', () => {
  assert.equal(
    deployTargetMismatch({ billing_deploy_target: 'app_b_ref' }, EXPECTED),
    true
  );
});

test('redactedWebhookPayload omits data.object', () => {
  const event = {
    id: 'evt_1',
    type: 'invoice.payment_failed',
    created: 1,
    livemode: false,
    api_version: '2023-10-16',
    data: { object: { customer: 'cus_secret', email: 'a@b.com' } },
  };
  const redacted = redactedWebhookPayload(event);
  assert.equal(redacted.redacted, true);
  assert.equal(redacted.id, 'evt_1');
  assert.equal(redacted.data, undefined);
});

test('stripeSubscriptionIdFromRef', () => {
  assert.equal(stripeSubscriptionIdFromRef('sub_abc'), 'sub_abc');
  assert.equal(stripeSubscriptionIdFromRef({ id: 'sub_xyz' }), 'sub_xyz');
  assert.equal(stripeSubscriptionIdFromRef(null), null);
});

test('classify: checkout legacy without deploy target processes', async () => {
  const decision = await classifyStripeEventCore(
    {
      type: 'checkout.session.completed',
      data: { object: { metadata: { product_id: 'app_a' } } },
    },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stubSupabase()),
    }
  );
  assert.deepEqual(decision, { action: 'process' });
});

test('classify: checkout deploy target mismatch ignores', async () => {
  const decision = await classifyStripeEventCore(
    {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { billing_deploy_target: 'other_ref' },
        },
      },
    },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stubSupabase()),
    }
  );
  assert.deepEqual(decision, {
    action: 'ignore',
    reason: 'billing_deploy_target_mismatch',
  });
});

test('classify: foreign invoice ignores without customer fallback', async () => {
  const stub = stubSupabase(new Map());
  const decision = await classifyStripeEventCore(
    {
      type: 'invoice.payment_failed',
      data: {
        object: {
          subscription: 'sub_other_app_only',
          customer: 'cus_shared',
        },
      },
    },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stub),
      allowedProductIds: allowedSet(stub),
    }
  );
  assert.deepEqual(decision, {
    action: 'ignore',
    reason: 'unknown_stripe_subscription',
  });
});

test('classify: owned invoice processes', async () => {
  const stub = stubSupabase(
    new Map([
      [
        'sub_owned',
        {
          user_id: 'user-1',
          product_id: 'app_a',
        },
      ],
    ])
  );
  const decision = await classifyStripeEventCore(
    {
      type: 'invoice.paid',
      data: {
        object: { subscription: 'sub_owned', customer: 'cus_shared' },
      },
    },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stub),
      allowedProductIds: allowedSet(stub),
    }
  );
  assert.deepEqual(decision, { action: 'process' });
});

test('classify: subscription deploy target mismatch ignores', async () => {
  const stub = stubSupabase(
    new Map([['sub_1', { user_id: 'u', product_id: 'app_a' }]])
  );
  const decision = await classifyStripeEventCore(
    {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          metadata: { billing_deploy_target: 'other_ref' },
        },
      },
    },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stub),
      allowedProductIds: allowedSet(stub),
    }
  );
  assert.deepEqual(decision, {
    action: 'ignore',
    reason: 'billing_deploy_target_mismatch',
  });
});

test('classify: unknown product_id on owned row ignores', async () => {
  const stub = stubSupabase(
    new Map([['sub_1', { user_id: 'u', product_id: 'app_b' }]]),
    ['app_a']
  );
  const decision = await classifyStripeEventCore(
    {
      type: 'invoice.finalized',
      data: { object: { subscription: 'sub_1' } },
    },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stub),
      allowedProductIds: allowedSet(stub),
    }
  );
  assert.deepEqual(decision, {
    action: 'ignore',
    reason: 'unknown_product_id',
  });
});

test('classify: invoice without subscription ignores', async () => {
  const decision = await classifyStripeEventCore(
    {
      type: 'invoice.created',
      data: { object: {} },
    },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stubSupabase()),
    }
  );
  assert.deepEqual(decision, {
    action: 'ignore',
    reason: 'invoice_missing_subscription',
  });
});

test('classify: owned subscription update without mismatch processes', async () => {
  const stub = stubSupabase(
    new Map([['sub_1', { user_id: 'u', product_id: 'app_a' }]])
  );
  const decision = await classifyStripeEventCore(
    {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          metadata: { billing_deploy_target: EXPECTED },
        },
      },
    },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stub),
      allowedProductIds: allowedSet(stub),
    }
  );
  assert.deepEqual(decision, { action: 'process' });
});

test('classify: trial_will_end for foreign subscription ignores', async () => {
  const stub = stubSupabase(new Map());
  const decision = await classifyStripeEventCore(
    {
      type: 'customer.subscription.trial_will_end',
      data: { object: { id: 'sub_foreign' } },
    },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stub),
      allowedProductIds: allowedSet(stub),
    }
  );
  assert.deepEqual(decision, {
    action: 'ignore',
    reason: 'unknown_stripe_subscription',
  });
});

test('classify: subscription without id ignores', async () => {
  const decision = await classifyStripeEventCore(
    {
      type: 'customer.subscription.updated',
      data: { object: { metadata: {} } },
    },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stubSupabase()),
    }
  );
  assert.deepEqual(decision, {
    action: 'ignore',
    reason: 'unknown_stripe_subscription',
  });
});

test('classify: unhandled event type processes', async () => {
  const decision = await classifyStripeEventCore(
    { type: 'payment_intent.succeeded', data: {} },
    {
      expectedTarget: EXPECTED,
      findOwnedSubscription: makeFindOwned(stubSupabase()),
    }
  );
  assert.deepEqual(decision, { action: 'process' });
});
