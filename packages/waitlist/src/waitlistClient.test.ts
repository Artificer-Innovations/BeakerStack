import { describe, expect, it, vi } from 'vitest';
import {
  approveWaitlistEntry,
  inviteWaitlistEmail,
  buildInviteUrl,
  consumeInvite,
  DEFAULT_WAITLIST_ADMIN_SETTINGS,
  getAdminWaitlistSettings,
  normalizeWaitlistAdminSettings,
  getPublicWaitlistSettings,
  getWaitlistEntry,
  listWaitlistEntries,
  rejectWaitlistEntry,
  resendWaitlistInvite,
  setWaitlistEntryProvisioningIntent,
  updateAdminWaitlistSettings,
  validateInvite,
} from './waitlistClient.js';

function createSupabase(
  rpcImpl: (
    name: string,
    args?: unknown
  ) => {
    data: unknown;
    error: { message: string } | null;
  }
) {
  return {
    rpc: vi.fn((name: string, args?: unknown) =>
      Promise.resolve(rpcImpl(name, args))
    ),
  } as never;
}

describe('waitlistClient', () => {
  it('getPublicWaitlistSettings returns data or null on error', async () => {
    const ok = createSupabase(() => ({
      data: { signup_mode: 'open' },
      error: null,
    }));
    const bad = createSupabase(() => ({ data: null, error: { message: 'x' } }));
    expect(await getPublicWaitlistSettings(ok)).toEqual({
      signup_mode: 'open',
    });
    expect(await getPublicWaitlistSettings(bad)).toBeNull();
  });

  it('validateInvite returns invalid on rpc error', async () => {
    const client = createSupabase(() => ({
      data: null,
      error: { message: 'x' },
    }));
    expect(await validateInvite(client, 't')).toEqual({ valid: false });
  });

  it('validateInvite returns parsed payload', async () => {
    const client = createSupabase(() => ({
      data: { valid: true, email: 'a@b.com' },
      error: null,
    }));
    expect(await validateInvite(client, 't')).toEqual({
      valid: true,
      email: 'a@b.com',
    });
  });

  it('consumeInvite maps rpc errors and success', async () => {
    const err = createSupabase(() => ({
      data: null,
      error: { message: 'bad' },
    }));
    expect(await consumeInvite(err, 't', 'u1')).toEqual({ error: 'bad' });

    const ok = createSupabase((name, args) => {
      expect(name).toBe('waitlist_consume_invite');
      expect(args).toEqual({
        p_token: 't',
        p_user_id: 'u1',
        p_user_email: 'a@b.com',
      });
      return {
        data: { ok: true, default_plan_id: 'beakerstack_free' },
        error: null,
      };
    });
    expect(await consumeInvite(ok, 't', 'u1', 'a@b.com')).toEqual({
      ok: true,
      default_plan_id: 'beakerstack_free',
    });

    const noEmail = createSupabase((name, args) => {
      expect(args).toEqual({
        p_token: 't',
        p_user_id: 'u1',
        p_user_email: null,
      });
      return { data: { ok: true }, error: null };
    });
    expect(await consumeInvite(noEmail, 't', 'u1')).toEqual({ ok: true });
  });

  it('listWaitlistEntries normalizes list payload and params', async () => {
    const client = createSupabase((name, args) => {
      expect(name).toBe('admin_list_waitlist_entries');
      expect(args).toEqual({
        p_limit: 10,
        p_offset: 5,
        p_search: 'acme',
        p_status: 'pending',
      });
      return {
        data: { entries: [{ id: 'e1' }], total: 1, limit: 25, offset: 0 },
        error: null,
      };
    });
    expect(
      await listWaitlistEntries(client, {
        limit: 10,
        offset: 5,
        search: 'acme',
        status: 'pending',
      })
    ).toEqual({
      entries: [{ id: 'e1' }],
      total: 1,
      limit: 25,
      offset: 0,
    });

    const partial = createSupabase(() => ({
      data: {},
      error: null,
    }));
    expect(await listWaitlistEntries(partial)).toEqual({
      entries: [],
      total: 0,
      limit: 25,
      offset: 0,
    });

    const rpcErr = createSupabase(() => ({
      data: null,
      error: { message: 'rpc' },
    }));
    expect(await listWaitlistEntries(rpcErr)).toBeNull();

    const noData = createSupabase(() => ({ data: null, error: null }));
    expect(await listWaitlistEntries(noData)).toBeNull();

    const denied = createSupabase(() => ({
      data: { error: 'denied' },
      error: null,
    }));
    expect(await listWaitlistEntries(denied)).toBeNull();
  });

  it('getWaitlistEntry returns null on error', async () => {
    const client = createSupabase(() => ({
      data: { error: 'nf' },
      error: null,
    }));
    expect(await getWaitlistEntry(client, 'id')).toBeNull();

    const rpcErr = createSupabase(() => ({
      data: null,
      error: { message: 'rpc' },
    }));
    expect(await getWaitlistEntry(rpcErr, 'id')).toBeNull();

    const noData = createSupabase(() => ({ data: null, error: null }));
    expect(await getWaitlistEntry(noData, 'id')).toBeNull();
  });

  it('getWaitlistEntry returns row on success', async () => {
    const client = createSupabase(() => ({
      data: { id: 'e1', email: 'a@b.com' },
      error: null,
    }));
    expect(await getWaitlistEntry(client, 'id')).toEqual({
      id: 'e1',
      email: 'a@b.com',
    });
  });

  it('updateAdminWaitlistSettings returns null on failure', async () => {
    const client = createSupabase(() => ({
      data: { error: 'bad' },
      error: null,
    }));
    expect(
      await updateAdminWaitlistSettings(client, { signup_mode: 'open' })
    ).toBeNull();

    const rpcErr = createSupabase(() => ({
      data: null,
      error: { message: 'rpc' },
    }));
    expect(
      await updateAdminWaitlistSettings(rpcErr, { signup_mode: 'open' })
    ).toBeNull();

    const noData = createSupabase(() => ({ data: null, error: null }));
    expect(
      await updateAdminWaitlistSettings(noData, { signup_mode: 'open' })
    ).toBeNull();
  });

  it('updateAdminWaitlistSettings passes nulls for omitted patch fields', async () => {
    const client = createSupabase((name, args) => {
      expect(name).toBe('admin_update_waitlist_settings');
      expect(args).toEqual({
        p_signup_mode: null,
        p_default_plan_id: null,
        p_invite_ttl_days: null,
        p_identity_match_mode: null,
        p_copy: null,
        p_metadata_schema: null,
      });
      return { data: { signup_mode: 'open' }, error: null };
    });
    await updateAdminWaitlistSettings(client, {});
    expect(client.rpc).toHaveBeenCalled();
  });

  it('handles admin settings read failures', async () => {
    const rpcErr = createSupabase(() => ({
      data: null,
      error: { message: 'rpc' },
    }));
    expect(await getAdminWaitlistSettings(rpcErr)).toBeNull();

    const denied = createSupabase(() => ({
      data: { error: 'forbidden' },
      error: null,
    }));
    expect(await getAdminWaitlistSettings(denied)).toBeNull();

    const noData = createSupabase(() => ({ data: null, error: null }));
    expect(await getAdminWaitlistSettings(noData)).toBeNull();
  });

  it('rejectWaitlistEntry and resendWaitlistInvite map rpc errors', async () => {
    const rejectErr = createSupabase(() => ({
      data: null,
      error: { message: 'reject rpc' },
    }));
    expect(await rejectWaitlistEntry(rejectErr, 'e1')).toEqual({
      error: 'reject rpc',
    });

    const resendErr = createSupabase(() => ({
      data: null,
      error: { message: 'resend rpc' },
    }));
    expect(await resendWaitlistInvite(resendErr, 'e1')).toEqual({
      error: 'resend rpc',
    });
  });

  it('normalizeWaitlistAdminSettings fills null RPC fields', () => {
    expect(
      normalizeWaitlistAdminSettings({
        signup_mode: null,
        default_plan_id: null,
        invite_ttl_days: null,
        identity_match_mode: null,
        copy: null,
        metadata_schema: null,
        updated_at: null,
      })
    ).toMatchObject({
      signup_mode: 'open',
      default_plan_id: 'beakerstack_free',
      invite_ttl_days: 7,
      identity_match_mode: 'lenient',
    });
  });

  it('normalizeWaitlistAdminSettings keeps valid RPC fields', () => {
    const copy = { waitlist: { headline: 'Hi' } };
    const metadata_schema = [
      { id: 'role', label: 'Role', type: 'text' as const },
    ];

    expect(
      normalizeWaitlistAdminSettings({
        signup_mode: 'invite_only',
        default_plan_id: 'beakerstack_pro',
        invite_ttl_days: 14,
        identity_match_mode: 'strict',
        copy,
        metadata_schema,
        updated_at: '2026-05-18T00:00:00Z',
      })
    ).toEqual({
      signup_mode: 'invite_only',
      default_plan_id: 'beakerstack_pro',
      invite_ttl_days: 14,
      identity_match_mode: 'strict',
      copy,
      metadata_schema,
      updated_at: '2026-05-18T00:00:00Z',
    });
  });

  it('normalizeWaitlistAdminSettings accepts every signup mode', () => {
    for (const signup_mode of [
      'open',
      'waitlist',
      'invite_only',
      'closed',
    ] as const) {
      expect(normalizeWaitlistAdminSettings({ signup_mode }).signup_mode).toBe(
        signup_mode
      );
    }
  });

  it('normalizeWaitlistAdminSettings rejects invalid field values', () => {
    expect(
      normalizeWaitlistAdminSettings({
        signup_mode: 'bogus',
        default_plan_id: '',
        invite_ttl_days: 0,
        identity_match_mode: 'fuzzy',
        copy: ['not', 'an', 'object'],
        metadata_schema: 'nope',
        updated_at: 123,
      })
    ).toEqual(DEFAULT_WAITLIST_ADMIN_SETTINGS);
  });

  it('getAdminWaitlistSettings and updateAdminWaitlistSettings', async () => {
    const settings = { signup_mode: 'waitlist' as const };
    const getClient = createSupabase(() => ({ data: settings, error: null }));
    expect(await getAdminWaitlistSettings(getClient)).toEqual(
      normalizeWaitlistAdminSettings(settings)
    );

    const patchClient = createSupabase(() => ({ data: settings, error: null }));
    expect(
      await updateAdminWaitlistSettings(patchClient, { signup_mode: 'open' })
    ).toEqual(normalizeWaitlistAdminSettings(settings));
  });

  it('approve, reject, and resend admin actions', async () => {
    const approveClient = createSupabase(() => ({
      data: { invite_token: 'tok', email: 'a@b.com' },
      error: null,
    }));
    expect(await approveWaitlistEntry(approveClient, 'e1')).toEqual({
      invite_token: 'tok',
      email: 'a@b.com',
    });

    const approveErr = createSupabase(() => ({
      data: { error: 'denied' },
      error: null,
    }));
    expect(await approveWaitlistEntry(approveErr, 'e1')).toEqual({
      error: 'denied',
    });

    const approveRpcErr = createSupabase(() => ({
      data: null,
      error: { message: 'rpc fail' },
    }));
    expect(await approveWaitlistEntry(approveRpcErr, 'e1')).toEqual({
      error: 'rpc fail',
    });

    const rejectClient = createSupabase(() => ({
      data: { ok: true },
      error: null,
    }));
    expect(await rejectWaitlistEntry(rejectClient, 'e1')).toEqual({ ok: true });

    const resendClient = createSupabase(() => ({
      data: { invite_token: 'tok2', email: 'a@b.com' },
      error: null,
    }));
    expect(await resendWaitlistInvite(resendClient, 'e1')).toEqual({
      invite_token: 'tok2',
      email: 'a@b.com',
    });
  });

  it('inviteWaitlistEmail maps rpc success and errors', async () => {
    const ok = createSupabase((name, args) => {
      expect(name).toBe('admin_invite_waitlist_email');
      expect(args).toEqual({
        p_email: 'new@example.com',
        p_metadata: { note: 'vip' },
        p_provisioning_intent: null,
        p_update_provisioning_intent: false,
        p_allowed_comp_plan_ids: null,
      });
      return {
        data: {
          ok: true,
          invite_token: 'tok',
          email: 'new@example.com',
          entry_id: 'e2',
          created: true,
        },
        error: null,
      };
    });
    expect(
      await inviteWaitlistEmail(ok, 'new@example.com', {
        metadata: { note: 'vip' },
      })
    ).toEqual({
      ok: true,
      invite_token: 'tok',
      email: 'new@example.com',
      entry_id: 'e2',
      created: true,
    });

    const denied = createSupabase(() => ({
      data: { error: 'already_converted' },
      error: null,
    }));
    expect(await inviteWaitlistEmail(denied, 'x@y.com')).toEqual({
      error: 'already_converted',
    });

    const rpcErr = createSupabase(() => ({
      data: null,
      error: { message: 'rpc fail' },
    }));
    expect(await inviteWaitlistEmail(rpcErr, 'x@y.com')).toEqual({
      error: 'rpc fail',
    });

    const defaultMeta = createSupabase((name, args) => {
      expect(args).toEqual({
        p_email: 'x@y.com',
        p_metadata: {},
        p_provisioning_intent: null,
        p_update_provisioning_intent: false,
        p_allowed_comp_plan_ids: null,
      });
      return { data: { ok: true }, error: null };
    });
    expect(await inviteWaitlistEmail(defaultMeta, 'x@y.com')).toEqual({
      ok: true,
    });
  });

  it('approveWaitlistEntry forwards provisioning intent options', async () => {
    const client = createSupabase((name, args) => {
      expect(name).toBe('admin_approve_waitlist_entry');
      expect(args).toEqual({
        p_id: 'e1',
        p_provisioning_intent: {
          kind: 'billing_comp',
          planId: 'beakerstack_vip',
          reason: 'Partner',
        },
        p_update_provisioning_intent: true,
        p_allowed_comp_plan_ids: ['beakerstack_vip'],
      });
      return { data: { ok: true }, error: null };
    });
    expect(
      await approveWaitlistEntry(client, 'e1', {
        provisioningIntent: {
          kind: 'billing_comp',
          planId: 'beakerstack_vip',
          reason: 'Partner',
        },
        allowedCompPlanIds: ['beakerstack_vip'],
      })
    ).toEqual({ ok: true });
  });

  it('setWaitlistEntryProvisioningIntent maps rpc results', async () => {
    const ok = createSupabase(() => ({
      data: { ok: true, provisioning_intent: { kind: 'billing_comp' } },
      error: null,
    }));
    expect(
      await setWaitlistEntryProvisioningIntent(ok, 'e1', null, [
        'beakerstack_vip',
      ])
    ).toEqual({ ok: true, provisioning_intent: { kind: 'billing_comp' } });
  });

  it('buildInviteUrl strips trailing slash and encodes token', () => {
    expect(buildInviteUrl('http://localhost:5173/', 'a b')).toBe(
      'http://localhost:5173/signup/invite#token=a%20b'
    );
    expect(buildInviteUrl('http://localhost:5173', 'plain')).toBe(
      'http://localhost:5173/signup/invite#token=plain'
    );
  });
});
