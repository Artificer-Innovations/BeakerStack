import { describe, expect, it, vi, beforeEach } from 'vitest';
import { launchStripeCheckout } from './launchStripeCheckout.native.js';
import * as openExternalUrlModule from './openExternalUrl.native.js';

describe('launchStripeCheckout (native)', () => {
  const startCheckout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(openExternalUrlModule, 'openExternalUrl').mockResolvedValue(
      undefined
    );
  });

  it('returns false when checkout session is missing', async () => {
    startCheckout.mockResolvedValue(null);

    const ok = await launchStripeCheckout(startCheckout, 'plan_pro');

    expect(ok).toBe(false);
    expect(openExternalUrlModule.openExternalUrl).not.toHaveBeenCalled();
  });

  it('returns false when checkoutUrl is empty', async () => {
    startCheckout.mockResolvedValue({ checkoutUrl: '' });

    const ok = await launchStripeCheckout(startCheckout, 'plan_pro');

    expect(ok).toBe(false);
    expect(openExternalUrlModule.openExternalUrl).not.toHaveBeenCalled();
  });

  it('opens checkout URL and returns true on success', async () => {
    startCheckout.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.test/cs_test',
    });

    const ok = await launchStripeCheckout(
      startCheckout,
      'plan_pro',
      'annual',
      14
    );

    expect(ok).toBe(true);
    expect(startCheckout).toHaveBeenCalledWith('plan_pro', 'annual', 14);
    expect(openExternalUrlModule.openExternalUrl).toHaveBeenCalledWith(
      'https://checkout.stripe.test/cs_test'
    );
  });

  it('defaults cadence to monthly when omitted', async () => {
    startCheckout.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.test/cs_test',
    });

    await launchStripeCheckout(startCheckout, 'plan_starter');

    expect(startCheckout).toHaveBeenCalledWith(
      'plan_starter',
      'monthly',
      undefined
    );
  });
});
