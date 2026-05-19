/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initObservability, resetForTesting } from '../init.web.js';
import * as SentryMock from '@sentry/react';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  getClient: vi.fn(),
}));

describe('initObservability (web)', () => {
  beforeEach(() => {
    vi.mocked(SentryMock.init).mockClear();
    vi.mocked(SentryMock.getClient).mockReturnValue(null);
    resetForTesting();
  });

  const config = { project: 'test', environment: 'test' };

  it('calls Sentry.init on first call', async () => {
    await initObservability(config);
    expect(SentryMock.init).toHaveBeenCalledTimes(1);
  });

  it('does not call Sentry.init a second time', async () => {
    await initObservability(config);
    await initObservability(config);
    expect(SentryMock.init).toHaveBeenCalledTimes(1);
  });

  it('throws on OTLP config', async () => {
    await expect(initObservability({ ...config, exporter: { type: 'otlp' } })).rejects.toThrow(/OTLP/);
  });

  it('skips init when getClient already returns a client', async () => {
    vi.mocked(SentryMock.getClient).mockReturnValue({} as any);
    await initObservability(config);
    expect(SentryMock.init).not.toHaveBeenCalled();
  });

  it('beforeSend strips ip_address when captureIp is not set', async () => {
    await initObservability(config);
    const { beforeSend } = vi.mocked(SentryMock.init).mock.calls[0][0] as any;
    const event = { user: { ip_address: '1.2.3.4', id: 'u_abc' } };
    const result = beforeSend(event);
    expect(result.user.ip_address).toBeUndefined();
  });

  it('beforeSend preserves ip_address when captureIp is true', async () => {
    await initObservability({ ...config, pii: { captureIp: true } });
    const { beforeSend } = vi.mocked(SentryMock.init).mock.calls[0][0] as any;
    const event = { user: { ip_address: '1.2.3.4' } };
    const result = beforeSend(event);
    expect(result.user.ip_address).toBe('1.2.3.4');
  });

  it('beforeSend returns event unchanged when no user', async () => {
    await initObservability(config);
    const { beforeSend } = vi.mocked(SentryMock.init).mock.calls[0][0] as any;
    const event = { message: 'something happened' };
    expect(beforeSend(event)).toBe(event);
  });
});
