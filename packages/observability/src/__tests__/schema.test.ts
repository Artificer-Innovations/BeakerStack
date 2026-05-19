import { describe, it, expect } from 'vitest';
import { validateConfig } from '../schema.js';

describe('validateConfig', () => {
  const base = { project: 'test', environment: 'test' };

  it('passes valid config', () => {
    expect(() => validateConfig(base)).not.toThrow();
  });
  it('throws on missing project', () => {
    expect(() => validateConfig({ ...base, project: '' })).toThrow();
  });
  it('throws on sampling out of range', () => {
    expect(() => validateConfig({ ...base, sampling: { traces: 1.5 } })).toThrow();
  });
  it('throws on OTLP exporter', () => {
    expect(() => validateConfig({ ...base, exporter: { type: 'otlp' } })).toThrow(/OTLP/);
  });
  it('passes sentry exporter', () => {
    expect(() => validateConfig({ ...base, exporter: { type: 'sentry' } })).not.toThrow();
  });
});
