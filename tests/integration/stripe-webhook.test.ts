/**
 * stripe-webhook Edge Function ingress (optional).
 */

import {
  edgeFunctionsEnabled,
  getFunctionsBaseUrl,
} from '../utils/integration-edge-helpers';

const describeEdge = edgeFunctionsEnabled() ? describe : describe.skip;

describeEdge('stripe-webhook Edge integration', () => {
  it('rejects requests without stripe-signature', async () => {
    const base = getFunctionsBaseUrl();
    const res = await fetch(`${base}/stripe-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'evt_test', type: 'ping' }),
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects invalid stripe-signature', async () => {
    const base = getFunctionsBaseUrl();
    const res = await fetch(`${base}/stripe-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=0,v1=invalid',
      },
      body: JSON.stringify({
        id: 'evt_integration_invalid',
        type: 'checkout.session.completed',
        data: { object: {} },
      }),
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
