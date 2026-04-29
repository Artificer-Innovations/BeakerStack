import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBillingConfig } from './useBillingConfig.js';

describe('useBillingConfig', () => {
  it('throws outside BillingProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useBillingConfig())).toThrow(
        'useBillingConfig must be used within BillingProvider'
      );
    } finally {
      spy.mockRestore();
    }
  });
});
