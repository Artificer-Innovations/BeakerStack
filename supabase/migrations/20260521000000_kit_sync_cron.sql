-- Phase 3: pg_cron + pg_net for kit-sync scheduling.
-- Defines kit_sync_dequeue() (atomic dequeue for the worker) and
-- kit_sync_setup_cron() (SECURITY DEFINER RPC for cron registration,
-- called by scripts/ensure-kit-sync-cron.mjs at deploy time).

-- Extensions (Supabase projects have these available; IF NOT EXISTS is safe).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- ── Dequeue function ─────────────────────────────────────────────────────────
-- Atomically marks a batch of pending rows as 'processing' and returns them.
-- FOR UPDATE SKIP LOCKED prevents concurrent workers from double-processing.
--
-- Also reclaims rows stuck in 'processing' for >15 minutes — these are rows
-- where the Edge Function died after dequeuing but before updating status.
-- 'failed' rows are intentionally excluded: they are dead-lettered
-- (permanent errors or attempts >= 5) and require manual intervention.

CREATE OR REPLACE FUNCTION kit_sync_dequeue(batch_size int DEFAULT 10)
RETURNS SETOF marketing_email_sync_queue
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE marketing_email_sync_queue
  SET
    status            = 'processing',
    last_attempted_at = now()
  WHERE id IN (
    SELECT id
    FROM   marketing_email_sync_queue
    WHERE  status = 'pending'
       OR  (status = 'processing' AND last_attempted_at < now() - interval '15 minutes')
    ORDER  BY created_at
    LIMIT  batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

-- ── Cron registration helper ─────────────────────────────────────────────────
-- SECURITY DEFINER so service-role callers can register the cron job without
-- needing superuser or pg_cron schema privileges directly.
-- Called once at deploy time by scripts/ensure-kit-sync-cron.mjs via RPC.
--
-- The secret is stored as a database GUC (app.kit_cron_secret) rather than
-- embedded directly in the cron job body — cron.job.command is readable by
-- anyone with access to that table, so inlining the secret would expose it.
-- The job reads it at runtime via current_setting().
--
-- Uses net.http_post (pg_net is installed in the 'extensions' schema but
-- exposed as 'net' via search_path — verified on hosted Supabase).

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
  -- Persist the secret as a database-level GUC so the cron job body does not
  -- contain the plaintext value.
  EXECUTE format(
    'ALTER DATABASE %I SET app.kit_cron_secret = %L',
    current_database(),
    p_secret
  );

  -- Unschedule any stale job first (idempotent).
  PERFORM cron.unschedule('kit-sync-worker')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'kit-sync-worker'
  );

  PERFORM cron.schedule(
    'kit-sync-worker',
    '*/5 * * * *',
    format(
      $sql$
        SELECT net.http_post(
          url     := %L,
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || current_setting('app.kit_cron_secret')
          ),
          body    := '{}'::jsonb
        )
      $sql$,
      p_url
    )
  );
END;
$$;

-- Only superuser/service-role should call the setup function.
REVOKE ALL ON FUNCTION kit_sync_setup_cron(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION kit_sync_setup_cron(text, text) TO service_role;

-- kit_sync_dequeue is called by the Edge Function via service-role.
REVOKE ALL ON FUNCTION kit_sync_dequeue(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION kit_sync_dequeue(int) TO service_role;
