import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as RN from 'react-native';
import { openExternalUrl } from './openExternalUrl.native.js';

describe('openExternalUrl (native)', () => {
  beforeEach(() => {
    vi.spyOn(RN.Linking, 'canOpenURL').mockResolvedValue(true as never);
    vi.spyOn(RN.Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  it('opens URL when supported', async () => {
    await openExternalUrl('https://checkout.stripe.test/session');
    expect(RN.Linking.canOpenURL).toHaveBeenCalledWith(
      'https://checkout.stripe.test/session'
    );
    expect(RN.Linking.openURL).toHaveBeenCalledWith(
      'https://checkout.stripe.test/session'
    );
  });

  it('throws when URL cannot be opened', async () => {
    vi.mocked(RN.Linking.canOpenURL).mockResolvedValue(false as never);
    await expect(
      openExternalUrl('https://checkout.stripe.test/session')
    ).rejects.toMatchObject({ kind: 'stripe' });
  });
});
