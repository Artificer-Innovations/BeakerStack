import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatMoneyCents,
  formatMonthYear,
} from '@beakerstack/billing/presentation';

// Behavior is covered by packages/billing/src/presentation/formatters.test.ts.
// This file confirms the re-export resolves through the package entrypoint.
describe('billing/presentation entrypoint re-exports formatters', () => {
  it('exposes all three formatter functions', () => {
    expect(formatMoneyCents).toBeTypeOf('function');
    expect(formatDate).toBeTypeOf('function');
    expect(formatMonthYear).toBeTypeOf('function');
  });
});
