import { describe, expect, it } from 'vitest';
import { defineKitConfig } from '../adapters/kit/kitConfig.js';

describe('defineKitConfig', () => {
  it('returns config unchanged', () => {
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
});
