/**
 * Declares environment variables read via dot notation in `tests/`.
 *
 * Root `tsconfig.json` sets `noPropertyAccessFromIndexSignature`, so
 * `process.env.SUPABASE_URL` (etc.) requires an explicit `ProcessEnv` property;
 * bracket access would also work but is inconsistent with `test-clients.ts`.
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
      TEST_PASSWORD?: string;
      RUN_INTEGRATION_EDGE_TESTS?: string;
      STRIPE_SECRET_KEY?: string;
      CI_EXPORT_EDGE_TESTS?: string;
    }
  }
}

export {};
