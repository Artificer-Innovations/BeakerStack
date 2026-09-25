import base from '../../stryker.base.json' with { type: 'json' };

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...base,
  mutate: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.{test,spec}.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types.ts',
    '!src/**/*.types.ts',
    '!src/test/**',
    '!src/generated/**',
    'scripts/**/*.ts',
    '!scripts/**/*.{test,spec}.{ts,tsx}',
  ],
};
