import base from '../../stryker.base.json' with { type: 'json' };

const rest = { ...base };
delete rest.vitest;

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...rest,
  testRunner: 'jest',
  mutate: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.{test,spec}.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/*.d.ts',
    '!src/**/types/**',
    '!src/navigation/types.ts',
  ],
};
