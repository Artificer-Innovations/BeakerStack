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
      CI?: string;
      WEB_URL?: string;
      WEB_BASE_PATH?: string;
      E2E_TARGET?: string;
      E2E_BOOTSTRAP_URL?: string;
      E2E_SEED_EMAIL?: string;
      E2E_SEED_PASSWORD?: string;
      E2E_BASE_URL?: string;
      PREVIEW_SUPABASE_URL?: string;
      PREVIEW_SUPABASE_ANON_KEY?: string;
      PR_TESTING_SUPABASE_SERVICE_ROLE_KEY?: string;
      SUPABASE_ACCESS_TOKEN?: string;
      SUPABASE_PREVIEW_PROJECT_REF?: string;
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
