import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as RN from 'react-native';
import { openExternalUrl } from './openExternalUrl.native.js';

describe('openExternalUrl (coverage)', () => {
  beforeEach(() => {
    vi.spyOn(RN.Linking, 'canOpenURL').mockResolvedValue(false as never);
    vi.spyOn(RN.Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  it('uses "external link" in error when URL is not parseable by new URL()', async () => {
    await expect(openExternalUrl('not-a-valid-url')).rejects.toMatchObject({
      kind: 'stripe',
      message: 'Unable to open external link',
    });
  });

  it('strips path and query from a valid URL in the error message', async () => {
    await expect(
      openExternalUrl('https://pay.stripe.com/session/cs_secret?token=abc')
    ).rejects.toMatchObject({
      kind: 'stripe',
      message: 'Unable to open https://pay.stripe.com',
    });
  });
});
