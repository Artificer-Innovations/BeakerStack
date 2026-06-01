import { describe, expect, it } from 'vitest';
import {
  connectionListRowSchema,
  connectionStatusRowSchema,
  effectiveConnectionStatusSchema,
  storedConnectionStatusSchema,
  userSearchRowSchema,
} from './schema.js';

const UUID_A = 'c1000000-0000-0000-0000-000000000001';
const UUID_B = 'c1000000-0000-0000-0000-000000000002';

describe('storedConnectionStatusSchema', () => {
  it('accepts all stored statuses', () => {
    for (const status of [
      'pending',
      'accepted',
      'declined',
      'blocked',
      'disconnected',
    ] as const) {
      expect(storedConnectionStatusSchema.parse(status)).toBe(status);
    }
  });

  it('rejects invalid status', () => {
    expect(() => storedConnectionStatusSchema.parse('open')).toThrow();
  });
});

describe('effectiveConnectionStatusSchema', () => {
  it('accepts expired_pending', () => {
    expect(effectiveConnectionStatusSchema.parse('expired_pending')).toBe(
      'expired_pending'
    );
  });
});

describe('connectionListRowSchema', () => {
  it('parses a list row', () => {
    const row = connectionListRowSchema.parse({
      id: UUID_A,
      status: 'pending',
      effective_status: 'pending',
      initiator_user_id: UUID_A,
      recipient_user_id: UUID_B,
      is_initiator: true,
      username: 'alice',
      display_name: 'Alice',
      avatar_url: null,
      created_at: new Date().toISOString(),
      accepted_at: null,
    });
    expect(row.status).toBe('pending');
  });
});

describe('connectionStatusRowSchema', () => {
  it('parses status with none effective_status', () => {
    const row = connectionStatusRowSchema.parse({
      status: 'none',
      effective_status: 'none',
      is_initiator: false,
      connection_id: null,
    });
    expect(row.effective_status).toBe('none');
  });
});

describe('userSearchRowSchema', () => {
  it('parses search row', () => {
    const row = userSearchRowSchema.parse({
      user_id: UUID_B,
      username: 'bob',
      display_name: null,
      avatar_url: null,
    });
    expect(row.username).toBe('bob');
  });
});
