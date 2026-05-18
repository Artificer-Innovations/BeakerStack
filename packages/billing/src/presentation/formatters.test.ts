import { describe, expect, it, vi, afterEach } from 'vitest';
import { formatDate, formatMoneyCents, formatMonthYear } from './formatters.js';

describe('formatMoneyCents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats USD cents with $ symbol and decimal', () => {
    expect(formatMoneyCents(1999, 'usd')).toBe('$19.99');
  });

  it('formats EUR cents', () => {
    expect(formatMoneyCents(100, 'eur')).toMatch(/€|EUR/);
  });

  it('falls back to USD when currency code is not 3 characters', () => {
    expect(formatMoneyCents(100, 'US')).toBe('$1.00');
  });

  it('falls back to $N.NN when Intl.NumberFormat throws', () => {
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
      throw new Error('unsupported');
    });
    expect(formatMoneyCents(1234, 'usd')).toBe('$12.34');
  });
});

describe('formatDate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats a valid ISO string as en-US short date', () => {
    expect(formatDate('2024-06-15T12:00:00.000Z')).toBe('Jun 15, 2024');
  });

  it('returns a string for invalid date input without throwing', () => {
    expect(formatDate('not-a-date')).toBeTypeOf('string');
  });

  it('returns the original ISO string when toLocaleDateString throws', () => {
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new Error('locale');
    });
    expect(formatDate('2024-06-15T12:00:00.000Z')).toBe(
      '2024-06-15T12:00:00.000Z'
    );
  });
});

describe('formatMonthYear', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats a valid ISO string as en-US month + year', () => {
    expect(formatMonthYear('2024-03-01T00:00:00.000Z')).toBe('March 2024');
  });

  it('returns a string for invalid date input without throwing', () => {
    expect(formatMonthYear('bad')).toBeTypeOf('string');
  });

  it('returns the original ISO string when toLocaleDateString throws', () => {
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new Error('locale');
    });
    expect(formatMonthYear('2024-03-01T00:00:00.000Z')).toBe(
      '2024-03-01T00:00:00.000Z'
    );
  });
});
