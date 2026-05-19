import { describe, it, expect } from 'vitest';
import { hashUserId, scrubEmail, scrubRequest } from '../pii.js';

describe('hashUserId', () => {
  it('returns a u_ prefixed hex string', () => {
    expect(hashUserId('user-123')).toMatch(/^u_[0-9a-f]{16}$/);
  });
  it('is deterministic', () => {
    expect(hashUserId('user-123')).toBe(hashUserId('user-123'));
  });
  it('different inputs produce different outputs', () => {
    expect(hashUserId('user-123')).not.toBe(hashUserId('user-456'));
  });
  it('does not contain the original id', () => {
    expect(hashUserId('user-123')).not.toContain('user-123');
  });
});

describe('scrubEmail', () => {
  it('redacts email addresses', () => {
    expect(scrubEmail('contact user@example.com please')).toBe('contact [email] please');
  });
  it('leaves non-email strings unchanged', () => {
    expect(scrubEmail('hello world')).toBe('hello world');
  });
  it('redacts multiple emails', () => {
    expect(scrubEmail('a@b.com and c@d.org')).toBe('[email] and [email]');
  });
});

describe('scrubRequest', () => {
  it('redacts sensitive keys', () => {
    const result = scrubRequest({ password: 'secret', name: 'Alice' }) as any;
    expect(result.password).toBe('[redacted]');
    expect(result.name).toBe('Alice');
  });
  it('handles nested objects', () => {
    const result = scrubRequest({ user: { token: 'abc', id: '1' } }) as any;
    expect(result.user.token).toBe('[redacted]');
    expect(result.user.id).toBe('1');
  });
  it('handles arrays', () => {
    const result = scrubRequest([{ email: 'a@b.com' }, { name: 'Bob' }]) as any;
    expect(result[0].email).toBe('[redacted]');
    expect(result[1].name).toBe('Bob');
  });
  it('returns primitives unchanged', () => {
    expect(scrubRequest('hello')).toBe('hello');
    expect(scrubRequest(42)).toBe(42);
    expect(scrubRequest(null)).toBeNull();
  });
});
