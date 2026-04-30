import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBillingContext } from './useBillingContext.js';

describe('useBillingContext', () => {
  it('throws outside BillingProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useBillingContext())).toThrow(
        'useBillingContext must be used within BillingProvider'
      );
    } finally {
      spy.mockRestore();
    }
  });
});
