import { describe, it, expect } from '@jest/globals';
import { limLabel } from '../utils';

describe('limLabel', () => {
  it('returns ellipsis (\u2026) for null', () => {
    expect(limLabel(null)).toBe('…');
  });

  it('returns infinity symbol (\u221e) for -1', () => {
    expect(limLabel(-1)).toBe('∞');
  });

  it('returns string for a positive number', () => {
    expect(limLabel(42)).toBe('42');
  });

  it('returns "0" for zero', () => {
    expect(limLabel(0)).toBe('0');
  });
});
