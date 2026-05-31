-- Fix: replace GUC-based secret storage with a private config table.
-- ALTER DATABASE SET app.kit_cron_secret is blocked on hosted Supabase (error 42501)
-- even from a SECURITY DEFINER function. This migration introduces a singleton
-- config table and rewrites kit_sync_setup_cron() to upsert there instead.
-- The cron job body reads URL and secret from the table at runtime, so the
-- secret is never inlined in cron.job.command (same privacy guarantee as before).

CREATE TABLE IF NOT EXISTS public.kit_sync_runtime_config (
  singleton   boolean     PRIMARY KEY DEFAULT true,
  worker_url  text        NOT NULL,
  cron_secret text        NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton_only CHECK (singleton IS TRUE)
);

ALTER TABLE public.kit_sync_runtime_config ENABLE ROW LEVEL SECURITY;

-- Supabase's default privileges grant SELECT/INSERT/UPDATE/DELETE to anon and
-- authenticated on all new public tables. Revoke explicitly so the table is
-- inaccessible via PostgREST regardless of RLS policy state.
-- service_role is intentionally excluded: the SECURITY DEFINER function runs as
-- the owner and needs no table grant; omitting the service_role grant prevents
-- direct REST reads of cron_secret via the service key.
REVOKE ALL ON TABLE public.kit_sync_runtime_config FROM PUBLIC;
REVOKE ALL ON TABLE public.kit_sync_runtime_config FROM anon, authenticated;

-- ── Updated cron registration helper ─────────────────────────────────────────
-- Replaces ALTER DATABASE SET with an upsert into kit_sync_runtime_config.
-- Cron job body selects worker_url and cron_secret from the table at runtime.

CREATE OR REPLACE FUNCTION kit_sync_setup_cron(
  p_url    text,
  p_secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, net, public
AS $$
BEGIN
  -- Existing databases may still have app.kit_cron_secret set by the prior GUC-based
  -- migration. Best-effort reset so the stale value doesn't linger in pg_db_role_setting;
  -- silently ignored if ALTER DATABASE RESET is blocked on hosted Supabase.
  BEGIN
    EXECUTE format('ALTER DATABASE %I RESET app.kit_cron_secret', current_database());
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO public.kit_sync_runtime_config (singleton, worker_url, cron_secret, updated_at)
  VALUES (true, p_url, p_secret, now())
  ON CONFLICT (singleton) DO UPDATE SET
    worker_url  = EXCLUDED.worker_url,
    cron_secret = EXCLUDED.cron_secret,
    updated_at  = EXCLUDED.updated_at;

  PERFORM cron.unschedule('kit-sync-worker')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'kit-sync-worker'
  );

  PERFORM cron.schedule(
    'kit-sync-worker',
    '*/5 * * * *',
    $sql$
      SELECT net.http_post(
        url     := c.worker_url,
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || c.cron_secret
        ),
        body    := '{}'::jsonb
      )
      FROM public.kit_sync_runtime_config c
      WHERE c.singleton IS TRUE
      LIMIT 1
    $sql$
  );
END;
$$;

REVOKE ALL ON FUNCTION kit_sync_setup_cron(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION kit_sync_setup_cron(text, text) TO service_role;
