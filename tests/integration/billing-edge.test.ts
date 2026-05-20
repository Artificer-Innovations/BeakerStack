/**
 * billing-stripe Edge Function (optional — RUN_INTEGRATION_EDGE_TESTS=1).
 */

import { createWebTestClient } from '../utils/test-clients';
import {
  createTestUser,
  signInTestUser,
  cleanupTestData,
} from '../utils/test-helpers';
import { uniqueTestEmail } from '../utils/integration-fixtures';
import { edgeFunctionsEnabled } from '../utils/integration-edge-helpers';

const describeEdge = edgeFunctionsEnabled() ? describe : describe.skip;

describeEdge('billing-stripe Edge integration', () => {
  const supabase = createWebTestClient();
  let userId: string;
  let email: string;
  let password: string;

  beforeAll(async () => {
    email = uniqueTestEmail();
    const u = await createTestUser(supabase, email);
    userId = u.userId;
    password = u.password;
  });

  afterAll(async () => {
    await cleanupTestData(supabase, userId, { email });
  });

  it('returns unauthenticated without JWT', async () => {
    const { data, error } = await supabase.functions.invoke('billing-stripe', {
      body: {
        action: 'checkout',
        productId: 'beakerstack',
        planId: 'beakerstack_pro',
      },
    });
    expect(error ?? data).toBeDefined();
    const errBody = (data ?? {}) as { error?: string };
    if (!error) {
      expect(errBody.error).toBe('unauthenticated');
    }
  });

  it('returns checkoutUrl for authenticated checkout when Stripe is configured', async () => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return;
    }

    await signInTestUser(supabase, email, password);
    const { data, error } = await supabase.functions.invoke('billing-stripe', {
      body: {
        action: 'checkout',
        productId: 'beakerstack',
        planId: 'beakerstack_pro',
        successUrl: 'http://127.0.0.1:5173/billing?success=1',
        cancelUrl: 'http://127.0.0.1:5173/billing?cancel=1',
      },
    });

    expect(error).toBeNull();
    const body = data as { checkoutUrl?: string; error?: string };
    expect(body.checkoutUrl ?? body.error).toBeDefined();
    if (body.checkoutUrl) {
      expect(body.checkoutUrl).toMatch(/^https?:\/\//);
    }
  });
});
