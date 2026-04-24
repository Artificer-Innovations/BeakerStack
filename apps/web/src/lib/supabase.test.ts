import { describe, it, expect } from 'vitest';
import { Logger } from '@beakerstack/shared/utils/logger';

const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

const shouldRun = Boolean(url && anonKey);

describe('supabase client', () => {
  it('connects and can run a basic query', async () => {
    if (!shouldRun) {
      Logger.warn('Supabase env vars not set – skipping connection test');
      expect(true).toBe(true);
      return;
    }

    const { supabase } = await import('./supabase');

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    expect(Array.isArray(data)).toBe(true);
  });
});
