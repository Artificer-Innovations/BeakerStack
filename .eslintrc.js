module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // varsIgnorePattern covers _prefixed destructured variables (e.g. const { _unused, ...rest } = obj)
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'error',
    'no-debugger': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.config.js',
    '*.config.ts',
  ],
  overrides: [
    {
      files: ['**/*.cjs', 'scripts/**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: [
        '**/__tests__/**/*.{ts,tsx}',
        '**/*.test.{ts,tsx}',
        '**/__mocks__/**/*.{ts,tsx}',
      ],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['supabase/functions/**'],
      rules: {
        // Deno edge functions log to stdout; no shared logger package in this runtime.
        'no-console': 'off',
        // Pagination/backfill loops commonly use while (true) with break.
        'no-constant-condition': 'off',
      },
    },
    {
      files: ['packages/logger/src/**'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['scripts/**/*.mjs'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: [
        'tests/**/*.{ts,tsx}',
        'packages/shared-tests/**/*.{ts,tsx}',
        'apps/mobile/__tests__/**/*.{ts,tsx}',
        'scripts/**/*.js',
      ],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};
