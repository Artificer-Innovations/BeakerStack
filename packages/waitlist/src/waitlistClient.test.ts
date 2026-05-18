import { describe, expect, it, vi } from 'vitest';
import {
  approveWaitlistEntry,
  buildInviteUrl,
  consumeInvite,
  getAdminWaitlistSettings,
  getPublicWaitlistSettings,
  getWaitlistEntry,
  listWaitlistEntries,
  rejectWaitlistEntry,
  resendWaitlistInvite,
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

    const ok = createSupabase(() => ({
      data: { ok: true, default_plan_id: 'beakerstack_free' },
      error: null,
    }));
    expect(await consumeInvite(ok, 't', 'u1', 'a@b.com')).toEqual({
      ok: true,
      default_plan_id: 'beakerstack_free',
    });
  });

  it('listWaitlistEntries normalizes list payload', async () => {
    const client = createSupabase(() => ({
      data: { entries: [{ id: 'e1' }], total: 1, limit: 25, offset: 0 },
      error: null,
    }));
    expect(await listWaitlistEntries(client)).toEqual({
      entries: [{ id: 'e1' }],
      total: 1,
      limit: 25,
      offset: 0,
    });
    const empty = createSupabase(() => ({
      data: { error: 'denied' },
      error: null,
    }));
    expect(await listWaitlistEntries(empty)).toBeNull();
  });

  it('getWaitlistEntry returns null on error', async () => {
    const client = createSupabase(() => ({
      data: { error: 'nf' },
      error: null,
    }));
    expect(await getWaitlistEntry(client, 'id')).toBeNull();
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
  });

  it('handles admin settings read failures', async () => {
    const rpcErr = createSupabase(() => ({
      data: null,
      error: { message: 'rpc' },
    }));
    expect(await getAdminWaitlistSettings(rpcErr)).toBeNull();
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

  it('getAdminWaitlistSettings and updateAdminWaitlistSettings', async () => {
    const settings = { signup_mode: 'waitlist' as const };
    const getClient = createSupabase(() => ({ data: settings, error: null }));
    expect(await getAdminWaitlistSettings(getClient)).toEqual(settings);

    const patchClient = createSupabase(() => ({ data: settings, error: null }));
    expect(
      await updateAdminWaitlistSettings(patchClient, { signup_mode: 'open' })
    ).toEqual(settings);
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

  it('buildInviteUrl strips trailing slash and encodes token', () => {
    expect(buildInviteUrl('http://localhost:5173/', 'a b')).toBe(
      'http://localhost:5173/signup/invite#token=a%20b'
    );
  });
});
