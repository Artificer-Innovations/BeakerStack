import { describe, it, expect } from 'vitest';
import { defineMarketingEmailConfig } from '../schema.js';

describe('defineMarketingEmailConfig', () => {
  it('returns config unchanged when valid', () => {
    const config = defineMarketingEmailConfig({ provider: 'kit', namespace: 'acme', kitFormId: '123' });
    expect(config.namespace).toBe('acme');
    expect(config.kitFormId).toBe('123');
  });

  it('throws when namespace is missing', () => {
    expect(() => defineMarketingEmailConfig({ provider: 'kit', namespace: '', kitFormId: '123' }))
      .toThrow('namespace is required');
  });

  it('throws when kitFormId is missing', () => {
    expect(() => defineMarketingEmailConfig({ provider: 'kit', namespace: 'acme', kitFormId: '' }))
      .toThrow('kitFormId is required');
  });

  it('accepts optional fields', () => {
    const config = defineMarketingEmailConfig({
      provider: 'kit',
      namespace: 'acme',
      kitFormId: '123',
      piiDisplay: 'hashed',
      tierTagNames: ['free', 'pro'],
    });
    expect(config.piiDisplay).toBe('hashed');
    expect(config.tierTagNames).toEqual(['free', 'pro']);
  });
});
