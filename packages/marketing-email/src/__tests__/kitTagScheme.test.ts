import { describe, it, expect } from 'vitest';
import {
  waitlistTag,
  waitlistApprovedTag,
  signupTag,
  tierTag,
  churnedTag,
} from '../adapters/kit/kitTagScheme.js';

describe('kitTagScheme', () => {
  const ns = 'acme';

  it('waitlistTag uses default separator', () => {
    expect(waitlistTag(ns)).toBe('acme:waitlist');
  });

  it('waitlistApprovedTag', () => {
    expect(waitlistApprovedTag(ns)).toBe('acme:waitlist-approved');
  });

  it('signupTag', () => {
    expect(signupTag(ns)).toBe('acme:signup');
  });

  it('tierTag with default opts', () => {
    expect(tierTag(ns, 'pro')).toBe('acme:tier:pro');
  });

  it('churnedTag', () => {
    expect(churnedTag(ns)).toBe('acme:churned');
  });

  it('respects custom separator', () => {
    expect(waitlistTag(ns, { separator: '.' })).toBe('acme.waitlist');
    expect(tierTag(ns, 'pro', { separator: '.' })).toBe('acme.tier.pro');
  });

  it('respects custom tierPrefix', () => {
    expect(tierTag(ns, 'pro', { tierPrefix: 'plan' })).toBe('acme:plan:pro');
  });

  it('waitlistApprovedTag respects custom separator', () => {
    expect(waitlistApprovedTag(ns, { separator: '.' })).toBe(
      'acme.waitlist-approved'
    );
  });

  it('signupTag respects custom separator', () => {
    expect(signupTag(ns, { separator: '.' })).toBe('acme.signup');
  });

  it('churnedTag respects custom separator', () => {
    expect(churnedTag(ns, { separator: '.' })).toBe('acme.churned');
  });

  it('tierTag uses default tierPrefix when only separator is customized', () => {
    expect(tierTag(ns, 'pro', { separator: '.' })).toBe('acme.tier.pro');
  });
});
