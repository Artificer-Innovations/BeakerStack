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

  it('calls Sentry.init on first call', () => {
    initObservability(config);
    expect(SentryMock.init).toHaveBeenCalledTimes(1);
  });

  it('does not call Sentry.init a second time', () => {
    initObservability(config);
    initObservability(config);
    expect(SentryMock.init).toHaveBeenCalledTimes(1);
  });

  it('throws on OTLP config', () => {
    expect(() => initObservability({ ...config, exporter: { type: 'otlp' } })).toThrow(/OTLP/);
  });
});
