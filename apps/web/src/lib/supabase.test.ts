import { describe, it, expect } from 'vitest';

const shouldRun = process.env.RUN_LIVE_SUPABASE_TEST === '1';

describe('supabase client', () => {
  it.skipIf(!shouldRun)('connects and can run a basic query', async () => {
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
