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
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@adopter/web/*', '@adopter/mobile/*'],
            message:
              'Import @adopter/web/* and @adopter/mobile/* only from extension seam files (see docs/CUSTOMIZING.md). @adopter/config/* is allowed in template code.',
          },
        ],
      },
    ],
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
    'infra/aws/functions/',
    'vendor/image-size/',
  ],
  overrides: [
    {
      files: [
        'apps/web/src/main.tsx',
        'apps/web/scripts/prerender-home.ts',
        'apps/web/src/App.tsx',
        'apps/web/src/pages/billing/BillingOverviewPage.tsx',
        'apps/web/src/pages/billing/BillingUsagePage.tsx',
        'apps/web/src/pages/billing/BillingPlansPage.tsx',
        'apps/mobile/src/navigation/AppNavigator.tsx',
        'apps/mobile/App.tsx',
        'apps/mobile/src/screens/billing/BillingOverviewScreen.tsx',
        'apps/mobile/src/screens/billing/BillingUsageScreen.tsx',
        'adopter/**/*.{ts,tsx}',
      ],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
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
        'packages/shared-tests/setup.adopter.ts',
      ],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-restricted-imports': 'off',
      },
    },
    {
      files: [
        'apps/web/**/*.{test,spec}.{ts,tsx}',
        'packages/admin/**/*.{test,spec}.{ts,tsx}',
        'packages/billing/**/*.{test,spec}.{ts,tsx}',
        'packages/email/**/*.{test,spec}.{ts,tsx}',
        'packages/lifecycle-events/**/*.{test,spec}.{ts,tsx}',
        'packages/logger/**/*.{test,spec}.{ts,tsx}',
        'packages/marketing-email/**/*.{test,spec}.{ts,tsx}',
        'packages/observability/**/*.{test,spec}.{ts,tsx}',
        'packages/test-utils/**/*.{test,spec}.{ts,tsx}',
        'packages/waitlist/**/*.{test,spec}.{ts,tsx}',
      ],
      plugins: ['@vitest'],
      extends: ['plugin:@vitest/legacy-recommended'],
      rules: {
        '@vitest/no-disabled-tests': 'error',
        '@vitest/prefer-expect-assertions': 'off',
      },
    },
    {
      files: [
        'apps/mobile/**/*.{test,spec}.{ts,tsx}',
        'packages/shared-tests/**/*.{test,spec}.{ts,tsx}',
        'tests/**/*.{test,spec}.{ts,tsx,js}',
      ],
      plugins: ['jest'],
      extends: ['plugin:jest/recommended'],
      rules: {
        'jest/expect-expect': [
          'error',
          { assertFunctionNames: ['expect', 'expectParseFailure'] },
        ],
        'jest/no-focused-tests': 'error',
        'jest/no-disabled-tests': 'error',
        'jest/valid-expect': 'error',
        'jest/no-conditional-expect': 'error',
        'jest/no-identical-title': 'error',
        'jest/no-jest-import': 'off',
      },
    },
    {
      files: ['**/*.{test,spec}.{tsx,jsx}'],
      plugins: ['testing-library', 'jest-dom'],
      rules: {
        'testing-library/await-async-queries': 'error',
        'testing-library/await-async-utils': 'error',
        'testing-library/no-await-sync-queries': 'error',
        'testing-library/no-wait-for-side-effects': 'error',
        'testing-library/no-wait-for-multiple-assertions': 'off',
        'testing-library/prefer-find-by': 'off',
        'testing-library/no-unnecessary-act': 'off',
        'testing-library/prefer-screen-queries': 'off',
        'testing-library/no-node-access': 'off',
        'jest-dom/prefer-checked': 'error',
        'jest-dom/prefer-enabled-disabled': 'error',
        'jest-dom/prefer-required': 'error',
      },
    },
    {
      files: [
        'packages/shared-tests/**/*.native*.test.{ts,tsx}',
        'packages/shared-tests/**/*.web.coverage.test.{ts,tsx}',
      ],
      rules: {
        // react-test-renderer findBy* helpers are synchronous, not RTL async queries.
        'testing-library/await-async-queries': 'off',
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
