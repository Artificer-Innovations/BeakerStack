import { describe, expect, it } from 'vitest';
import { beakerstackWaitlistConfig } from '../beakerstackWaitlistConfig';

describe('beakerstackWaitlistConfig', () => {
  it('exposes waitlist capture and ops function names', () => {
    expect(beakerstackWaitlistConfig.captureFunctionName).toBe(
      'waitlist-capture'
    );
    expect(beakerstackWaitlistConfig.opsFunctionName).toBe('waitlist-ops');
  });

  it('uses a browser origin when window is defined', () => {
    expect(beakerstackWaitlistConfig.appOrigin).toMatch(/^https?:\/\//);
  });
});
