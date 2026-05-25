import { describe, expect, it } from 'vitest';
import { defineKitConfig } from '../adapters/kit/kitConfig.js';

describe('defineKitConfig', () => {
  it('returns config unchanged when valid', () => {
    const config = defineKitConfig({
      formId: 'form-1',
      namespace: 'acme',
      tierTagNames: ['free', 'pro'],
    });
    expect(config).toEqual({
      formId: 'form-1',
      namespace: 'acme',
      tierTagNames: ['free', 'pro'],
    });
  });

  it('throws when formId is empty', () => {
    expect(() => defineKitConfig({ formId: '', namespace: 'acme' })).toThrow(
      'formId is required'
    );
  });

  it('throws when formId is whitespace-only', () => {
    expect(() => defineKitConfig({ formId: '   ', namespace: 'acme' })).toThrow(
      'formId is required'
    );
  });

  it('throws when namespace is empty', () => {
    expect(() => defineKitConfig({ formId: 'form-1', namespace: '' })).toThrow(
      'namespace is required'
    );
  });
});
