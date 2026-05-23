import { describe, expect, it, vi } from 'vitest';
import {
  normalizeMarketingEmailAdminSettings,
  DEFAULT_MARKETING_EMAIL_ADMIN_SETTINGS,
  getAdminMarketingEmailSettings,
  updateAdminMarketingEmailSettings,
  getAdminMarketingEmailQueueStats,
} from '../marketingEmailAdminClient.js';

function makeSupabase(rpcResult: { data: unknown; error: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(rpcResult) } as never;
}

describe('normalizeMarketingEmailAdminSettings', () => {
  it('normalizes a complete valid record', () => {
    const result = normalizeMarketingEmailAdminSettings({
      product_id: 'acme',
      enabled: true,
      provider: 'kit',
      config: {
        namespace: 'acme-ns',
        kitFormId: 'form-1',
        tierTagNames: ['pro'],
      },
      updated_at: '2026-01-01T00:00:00Z',
    });
    expect(result.product_id).toBe('acme');
    expect(result.enabled).toBe(true);
    expect(result.config.namespace).toBe('acme-ns');
    expect(result.config.kitFormId).toBe('form-1');
    expect(result.config.tierTagNames).toEqual(['pro']);
    expect(result.updated_at).toBe('2026-01-01T00:00:00Z');
  });

  it('falls back to defaults when fields are missing', () => {
    const result = normalizeMarketingEmailAdminSettings({});
    expect(result.product_id).toBe(
      DEFAULT_MARKETING_EMAIL_ADMIN_SETTINGS.product_id
    );
    expect(result.enabled).toBe(false);
    expect(result.config.namespace).toBe('');
    expect(result.config.kitFormId).toBe('');
    expect(result.config.tierTagNames).toEqual([]);
    expect(result.updated_at).toBe('');
  });

  it('falls back to defaults when config is not an object', () => {
    const result = normalizeMarketingEmailAdminSettings({
      product_id: 'acme',
      config: 'not-an-object',
    });
    expect(result.config.namespace).toBe('');
    expect(result.config.kitFormId).toBe('');
    expect(result.config.tierTagNames).toEqual([]);
  });

  it('falls back to defaults when config is an array', () => {
    const result = normalizeMarketingEmailAdminSettings({ config: ['a', 'b'] });
    expect(result.config.namespace).toBe('');
  });

  it('ignores non-string namespace', () => {
    const result = normalizeMarketingEmailAdminSettings({
      config: { namespace: 42, kitFormId: 'f', tierTagNames: [] },
    });
    expect(result.config.namespace).toBe('');
  });

  it('ignores non-array tierTagNames', () => {
    const result = normalizeMarketingEmailAdminSettings({
      config: { namespace: 'ns', kitFormId: 'f', tierTagNames: 'pro,max' },
    });
    expect(result.config.tierTagNames).toEqual([]);
  });

  it('always sets provider to kit', () => {
    const result = normalizeMarketingEmailAdminSettings({ provider: 'other' });
    expect(result.provider).toBe('kit');
  });
});

describe('getAdminMarketingEmailSettings', () => {
  it('returns null when rpc returns an error', async () => {
    const sb = makeSupabase({ data: null, error: new Error('db error') });
    expect(await getAdminMarketingEmailSettings(sb)).toBeNull();
  });

  it('returns null when data is null', async () => {
    const sb = makeSupabase({ data: null, error: null });
    expect(await getAdminMarketingEmailSettings(sb)).toBeNull();
  });

  it('returns null when data contains an error key', async () => {
    const sb = makeSupabase({ data: { error: 'not_found' }, error: null });
    expect(await getAdminMarketingEmailSettings(sb)).toBeNull();
  });

  it('returns null when settings payload is null', async () => {
    const sb = makeSupabase({
      data: { ok: true, settings: null },
      error: null,
    });
    expect(await getAdminMarketingEmailSettings(sb)).toBeNull();
  });

  it('returns normalized settings on success', async () => {
    const sb = makeSupabase({
      data: {
        ok: true,
        settings: {
          product_id: 'beakerstack',
          enabled: true,
          provider: 'kit',
          config: { namespace: 'bs', kitFormId: 'f-1', tierTagNames: [] },
          updated_at: '2026-01-01T00:00:00Z',
        },
      },
      error: null,
    });
    const result = await getAdminMarketingEmailSettings(sb, 'beakerstack');
    expect(result?.product_id).toBe('beakerstack');
    expect(result?.enabled).toBe(true);
    expect(result?.config.namespace).toBe('bs');
  });

  it('uses default productId when not provided', async () => {
    const sb = makeSupabase({ data: { error: 'not_found' }, error: null });
    await getAdminMarketingEmailSettings(sb);
    expect(sb.rpc).toHaveBeenCalledWith('admin_get_marketing_email_settings', {
      p_product_id: 'beakerstack',
    });
  });
});

describe('updateAdminMarketingEmailSettings', () => {
  it('returns null when rpc returns an error', async () => {
    const sb = makeSupabase({ data: null, error: new Error('db error') });
    expect(
      await updateAdminMarketingEmailSettings(sb, {
        product_id: 'beakerstack',
        enabled: false,
        config: { namespace: 'ns', kitFormId: 'f', tierTagNames: [] },
      })
    ).toBeNull();
  });

  it('returns null when data contains an error key', async () => {
    const sb = makeSupabase({
      data: { error: 'invalid_namespace' },
      error: null,
    });
    expect(
      await updateAdminMarketingEmailSettings(sb, {
        product_id: 'beakerstack',
        enabled: false,
        config: { namespace: '', kitFormId: 'f', tierTagNames: [] },
      })
    ).toBeNull();
  });

  it('returns normalized settings on success', async () => {
    const sb = makeSupabase({
      data: {
        ok: true,
        settings: {
          product_id: 'beakerstack',
          enabled: false,
          provider: 'kit',
          config: {
            namespace: 'ns',
            kitFormId: 'form-2',
            tierTagNames: ['pro'],
          },
          updated_at: '2026-01-02T00:00:00Z',
        },
      },
      error: null,
    });
    const result = await updateAdminMarketingEmailSettings(sb, {
      product_id: 'beakerstack',
      enabled: false,
      config: { namespace: 'ns', kitFormId: 'form-2', tierTagNames: ['pro'] },
    });
    expect(result?.config.kitFormId).toBe('form-2');
    expect(result?.config.tierTagNames).toEqual(['pro']);
  });
});

describe('getAdminMarketingEmailQueueStats', () => {
  it('returns null when rpc returns an error', async () => {
    const sb = makeSupabase({ data: null, error: new Error('db error') });
    expect(await getAdminMarketingEmailQueueStats(sb)).toBeNull();
  });

  it('returns null when data contains an error key', async () => {
    const sb = makeSupabase({ data: { error: 'not_found' }, error: null });
    expect(await getAdminMarketingEmailQueueStats(sb)).toBeNull();
  });

  it('returns counts on success', async () => {
    const sb = makeSupabase({
      data: { pending: 3, processing: 1, done: 42, failed: 2 },
      error: null,
    });
    const result = await getAdminMarketingEmailQueueStats(sb);
    expect(result?.pending).toBe(3);
    expect(result?.processing).toBe(1);
    expect(result?.done).toBe(42);
    expect(result?.failed).toBe(2);
  });

  it('falls back to 0 for non-number fields', async () => {
    const sb = makeSupabase({
      data: { pending: null, processing: null, done: null, failed: null },
      error: null,
    });
    const result = await getAdminMarketingEmailQueueStats(sb);
    expect(result?.pending).toBe(0);
    expect(result?.done).toBe(0);
  });
});
