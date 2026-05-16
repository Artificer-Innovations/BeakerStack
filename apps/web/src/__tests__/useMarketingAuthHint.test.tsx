import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMarketingAuthHint } from '../hooks/useMarketingAuthHint';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');

describe('useMarketingAuthHint', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('reflects localStorage on mount', () => {
    localStorage.setItem(
      'sb-localhost-auth-token',
      JSON.stringify({ access_token: 'jwt', refresh_token: 'r' })
    );
    const { result } = renderHook(() => useMarketingAuthHint());
    expect(result.current).toBe(true);
  });

  it('updates when storage event fires for auth key', () => {
    localStorage.setItem(
      'sb-localhost-auth-token',
      JSON.stringify({ access_token: 'jwt', refresh_token: 'r' })
    );
    const { result } = renderHook(() => useMarketingAuthHint());
    expect(result.current).toBe(true);

    localStorage.removeItem('sb-localhost-auth-token');
    act(() => {
      const storageEvent = new Event('storage');
      Object.defineProperty(storageEvent, 'key', {
        value: 'sb-localhost-auth-token',
      });
      Object.defineProperty(storageEvent, 'newValue', { value: null });
      window.dispatchEvent(storageEvent);
    });
    expect(result.current).toBe(false);
  });
});
