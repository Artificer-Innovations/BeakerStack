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

CREATE OR REPLACE FUNCTION kit_sync_setup_cron(
  p_url    text,
  p_secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
BEGIN
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
        SELECT extensions.http_post(
          url     := %L,
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || %L
          ),
          body    := '{}'::jsonb
        )
      $sql$,
      p_url,
      p_secret
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
