import { describe, it, expect } from 'vitest';
import { Logger } from '@beakerstack/logger';

const shouldRun = process.env.RUN_LIVE_SUPABASE_TEST === '1';

describe('supabase client', () => {
  it('connects and can run a basic query', async () => {
    if (!shouldRun) {
      Logger.warn(
        'RUN_LIVE_SUPABASE_TEST not set – skipping live Supabase connection test'
      );
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
