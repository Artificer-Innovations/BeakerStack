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

  const config = {
    project: 'test',
    environment: 'test',
    dsn: 'https://public@o0.ingest.sentry.io/0',
  };

  it('calls Sentry.init on first call', async () => {
    await initObservability(config);
    expect(SentryMock.init).toHaveBeenCalledTimes(1);
  });

  it('does not call Sentry.init a second time', async () => {
    await initObservability(config);
    await initObservability(config);
    expect(SentryMock.init).toHaveBeenCalledTimes(1);
  });

  it('swallows OTLP config validation errors', async () => {
    await expect(
      initObservability({ ...config, exporter: { type: 'otlp' } })
    ).resolves.toBeUndefined();
    expect(SentryMock.init).not.toHaveBeenCalled();
  });

  it('skips init when getClient already returns a client', async () => {
    vi.mocked(SentryMock.getClient).mockReturnValue({} as any);
    await initObservability(config);
    expect(SentryMock.init).not.toHaveBeenCalled();
  });

  it('passes dsn when provided', async () => {
    await initObservability({ ...config, dsn: 'https://key@sentry.io/123' });
    expect(SentryMock.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://key@sentry.io/123' })
    );
  });

  it('skips init when dsn is not provided', async () => {
    await initObservability({ project: 'test', environment: 'test' });
    expect(SentryMock.init).not.toHaveBeenCalled();
  });

  it('skips init when dsn is blank', async () => {
    await initObservability({
      project: 'test',
      environment: 'test',
      dsn: '  ',
    });
    expect(SentryMock.init).not.toHaveBeenCalled();
  });

  it('passes release when provided', async () => {
    await initObservability({ ...config, release: '1.2.3' });
    expect(SentryMock.init).toHaveBeenCalledWith(
      expect.objectContaining({ release: '1.2.3' })
    );
  });

  it('omits release when not provided', async () => {
    await initObservability(config);
    const call = vi.mocked(SentryMock.init).mock.calls[0][0] as any;
    expect(call).not.toHaveProperty('release');
  });

  it('passes custom sampling rates when provided', async () => {
    await initObservability({
      ...config,
      sampling: { traces: 0.5, replay: 0.1, replayOnError: 0.75 },
    });
    const call = vi.mocked(SentryMock.init).mock.calls[0][0] as any;
    expect(call.tracesSampleRate).toBe(0.5);
    expect(call.replaysSessionSampleRate).toBe(0.1);
    expect(call.replaysOnErrorSampleRate).toBe(0.75);
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

  it('does not mark initialized when Sentry.init throws', async () => {
    vi.mocked(SentryMock.init).mockImplementationOnce(() => {
      throw new Error('init failed');
    });

    await initObservability(config);
    expect(SentryMock.init).toHaveBeenCalledTimes(1);

    await initObservability(config);
    expect(SentryMock.init).toHaveBeenCalledTimes(2);
  });

  it('logs init failures outside test env', async () => {
    const originalNodeEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(SentryMock.init).mockImplementationOnce(() => {
      throw new Error('init failed');
    });

    await initObservability(config);

    expect(warnSpy).toHaveBeenCalledWith(
      '[observability] init failed:',
      expect.any(Error)
    );

    warnSpy.mockRestore();
    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }
  });
});

describe('initObservability when @sentry/react is unavailable', () => {
  it('resolves without throwing when import fails', async () => {
    vi.resetModules();
    vi.doMock('@sentry/react', () => {
      throw new Error('Cannot find module @sentry/react');
    });
    const mod = await import('../init.web.js');
    mod.resetForTesting();
    await expect(
      mod.initObservability({ project: 'test', environment: 'test' })
    ).resolves.toBeUndefined();
    vi.doUnmock('@sentry/react');
    vi.resetModules();
  });
});
