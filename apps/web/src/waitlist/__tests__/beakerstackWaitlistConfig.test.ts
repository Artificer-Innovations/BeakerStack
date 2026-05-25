import { describe, expect, it } from 'vitest';
import { waitlistConfig } from '@adopter/config/waitlist';

describe('waitlistConfig', () => {
  it('exposes waitlist capture and ops function names', () => {
    expect(waitlistConfig.captureFunctionName).toBe('waitlist-capture');
    expect(waitlistConfig.opsFunctionName).toBe('waitlist-ops');
  });

  it('uses a browser origin when window is defined', () => {
    expect(waitlistConfig.appOrigin).toMatch(/^https?:\/\//);
  });
});
