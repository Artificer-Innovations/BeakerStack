import { describe, it, expect } from 'vitest';
import { defineMarketingEmailConfig } from '../schema.js';

describe('defineMarketingEmailConfig', () => {
  it('returns config unchanged when valid', () => {
    const config = defineMarketingEmailConfig({
      provider: 'kit',
      namespace: 'acme',
      kitFormId: '123',
    });
    expect(config.namespace).toBe('acme');
    expect(config.kitFormId).toBe('123');
  });

  it('throws when namespace is missing', () => {
    expect(() =>
      defineMarketingEmailConfig({
        provider: 'kit',
        namespace: '',
        kitFormId: '123',
      })
    ).toThrow('namespace is required');
  });

  it('throws when kitFormId is missing', () => {
    expect(() =>
      defineMarketingEmailConfig({
        provider: 'kit',
        namespace: 'acme',
        kitFormId: '',
      })
    ).toThrow('kitFormId is required');
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

  it('accepts namespace with digits and hyphens', () => {
    expect(() =>
      defineMarketingEmailConfig({
        provider: 'kit',
        namespace: 'my-app-2',
        kitFormId: '123',
      })
    ).not.toThrow();
  });

  it('rejects namespace with uppercase letters', () => {
    expect(() =>
      defineMarketingEmailConfig({
        provider: 'kit',
        namespace: 'MyApp',
        kitFormId: '123',
      })
    ).toThrow('lowercase letters');
  });

  it('rejects namespace with spaces', () => {
    expect(() =>
      defineMarketingEmailConfig({
        provider: 'kit',
        namespace: 'my app',
        kitFormId: '123',
      })
    ).toThrow('lowercase letters');
  });

  it('rejects namespace starting with a digit', () => {
    expect(() =>
      defineMarketingEmailConfig({
        provider: 'kit',
        namespace: '1app',
        kitFormId: '123',
      })
    ).toThrow('lowercase letters');
  });

  it('rejects namespace with special characters', () => {
    expect(() =>
      defineMarketingEmailConfig({
        provider: 'kit',
        namespace: 'my_app',
        kitFormId: '123',
      })
    ).toThrow('lowercase letters');
  });
});
