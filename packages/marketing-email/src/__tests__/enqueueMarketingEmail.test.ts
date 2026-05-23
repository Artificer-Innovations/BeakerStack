import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueMarketingEmail } from '../edge.js';
import { Logger } from '@beakerstack/logger';

vi.mock('@beakerstack/logger', () => ({
  Logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

type SettingsResult =
  | { data: { enabled: boolean }; error: null }
  | { data: null; error: { message: string } }
  | { data: null; error: null };

type InsertResult =
  | { error: null }
  | { error: { code: string; message: string } };

function makeSupabaseMock(
  settingsResult: SettingsResult,
  insertResult: InsertResult = { error: null }
) {
  const insertMock = vi.fn().mockResolvedValue(insertResult);
  const maybeSingleMock = vi.fn().mockResolvedValue(settingsResult);

  const settingsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: maybeSingleMock,
  };

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'marketing_email_settings') return settingsChain;
    if (table === 'marketing_email_sync_queue') return { insert: insertMock };
    throw new Error(`Unexpected table: ${table}`);
  });

  return { supabase: { from } as unknown as SupabaseClient, insertMock };
}

describe('enqueueMarketingEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('logs and returns early when settings lookup fails', async () => {
    const { supabase } = makeSupabaseMock({ data: null, error: { message: 'db error' } });
    await enqueueMarketingEmail(
      supabase,
      'prod-1',
      'user.signed_up',
      'user@example.com',
      {},
      'key-1'
    );
    expect(Logger.error).toHaveBeenCalledWith(
      'enqueueMarketingEmail: settings lookup failed',
      'db error'
    );
  });

  it('returns early when marketing emails are disabled', async () => {
    const { supabase, insertMock } = makeSupabaseMock({ data: { enabled: false }, error: null });
    await enqueueMarketingEmail(
      supabase,
      'prod-1',
      'user.signed_up',
      'u@e.com',
      {},
      'k-1'
    );
    expect(insertMock).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('returns early when settings are null (product not configured)', async () => {
    const { supabase, insertMock } = makeSupabaseMock({ data: null, error: null });
    await enqueueMarketingEmail(
      supabase,
      'prod-1',
      'user.signed_up',
      'u@e.com',
      {},
      'k-1'
    );
    expect(insertMock).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('inserts into queue when marketing emails are enabled', async () => {
    const { supabase, insertMock } = makeSupabaseMock(
      { data: { enabled: true }, error: null },
      { error: null }
    );
    await enqueueMarketingEmail(
      supabase,
      'prod-1',
      'user.signed_up',
      'user@example.com',
      { plan: 'pro' },
      'key-1'
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: 'prod-1',
        event_type: 'user.signed_up',
        email: 'user@example.com',
        payload: { plan: 'pro' },
        idempotency_key: 'key-1',
      })
    );
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('logs error when insert fails with non-23505 code', async () => {
    const { supabase } = makeSupabaseMock(
      { data: { enabled: true }, error: null },
      { error: { code: 'some_error', message: 'insert failed' } }
    );
    await enqueueMarketingEmail(
      supabase,
      'prod-1',
      'user.signed_up',
      'u@e.com',
      {},
      'k-1'
    );
    expect(Logger.error).toHaveBeenCalledWith('enqueueMarketingEmail error', 'insert failed');
  });

  it('swallows 23505 unique violation silently', async () => {
    const { supabase } = makeSupabaseMock(
      { data: { enabled: true }, error: null },
      { error: { code: '23505', message: 'duplicate key' } }
    );
    await enqueueMarketingEmail(
      supabase,
      'prod-1',
      'user.signed_up',
      'u@e.com',
      {},
      'k-1'
    );
    expect(Logger.error).not.toHaveBeenCalled();
  });
});
