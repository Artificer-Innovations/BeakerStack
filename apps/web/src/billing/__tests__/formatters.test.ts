import { describe, expect, it, vi, afterEach } from 'vitest';
import { formatDate, formatMoneyCents, formatMonthYear } from '../formatters';

describe('formatMoneyCents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats USD cents', () => {
    expect(formatMoneyCents(1999, 'usd')).toMatch(/\$19\.99/);
  });

  it('normalizes short currency codes', () => {
    expect(formatMoneyCents(100, 'eur')).toMatch(/€|EUR/);
  });

  it('falls back when Intl.NumberFormat throws', () => {
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

  it('formats valid ISO strings', () => {
    const s = formatDate('2024-06-15T12:00:00.000Z');
    expect(s.length).toBeGreaterThan(4);
  });

  it('handles invalid date strings without throwing', () => {
    expect(formatDate('not-a-date')).toBeTruthy();
  });

  it('returns original string when toLocaleDateString throws', () => {
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

  it('formats valid ISO strings', () => {
    expect(formatMonthYear('2024-03-01T00:00:00.000Z')).toMatch(/2024/);
  });

  it('handles invalid date strings without throwing', () => {
    expect(formatMonthYear('bad')).toBeTruthy();
  });

  it('returns original string when toLocaleDateString throws', () => {
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new Error('locale');
    });
    expect(formatMonthYear('2024-03-01T00:00:00.000Z')).toBe(
      '2024-03-01T00:00:00.000Z'
    );
  });
});
