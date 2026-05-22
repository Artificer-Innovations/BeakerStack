-- Phase 4: add user.deleted lifecycle event for GDPR erasure propagation.
-- Extends the event_type CHECK on marketing_email_sync_queue and wires an
-- AFTER DELETE trigger on auth.users to enqueue the event.

-- ---------------------------------------------------------------------------
-- Extend event_type CHECK to include user.deleted
-- ---------------------------------------------------------------------------

ALTER TABLE public.marketing_email_sync_queue
  DROP CONSTRAINT IF EXISTS marketing_email_sync_queue_event_type_check;

ALTER TABLE public.marketing_email_sync_queue
  ADD CONSTRAINT marketing_email_sync_queue_event_type_check
  CHECK (event_type IN (
    'user.signed_up', 'waitlist.joined', 'waitlist.approved',
    'waitlist.converted', 'user.tier_changed', 'user.churned',
    'user.deleted'
  ));

-- ---------------------------------------------------------------------------
-- AFTER DELETE trigger: enqueue user.deleted when marketing email is enabled
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._marketing_email_on_user_deleted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_product_id text;
  v_email      text;
BEGIN
  v_email := lower(trim(OLD.email));

  -- No-op when email is NULL (OAuth-only users have no Kit record).
  IF v_email IS NULL OR v_email = '' THEN
    RETURN OLD;
  END IF;

  SELECT product_id INTO v_product_id
    FROM public.marketing_email_settings
    WHERE enabled = true
    ORDER BY product_id
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN OLD;
  END IF;

  -- Idempotent: a second DELETE trigger (shouldn't happen, but safe) is a no-op.
  INSERT INTO public.marketing_email_sync_queue
    (product_id, event_type, email, idempotency_key, payload, status)
  VALUES
    (v_product_id, 'user.deleted', v_email,
     'user.deleted:' || OLD.id::text,
     jsonb_build_object('user_id', OLD.id),
     'pending')
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER marketing_email_on_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public._marketing_email_on_user_deleted();

-- ---------------------------------------------------------------------------
-- Rate limit helper for kit-webhook Edge Function
-- Uses the shared waitlist_rate_limits table with a 'kit-webhook*:' prefix.
-- Returns true when the request is within the limit; false when exceeded.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kit_webhook_check_rate_limit(
  p_bucket_key text,
  p_window_start timestamptz,
  p_limit integer
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.waitlist_rate_limits (bucket_key, window_start, count)
  VALUES (p_bucket_key, date_trunc('hour', p_window_start), 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET count = public.waitlist_rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.kit_webhook_check_rate_limit(text, timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kit_webhook_check_rate_limit(text, timestamptz, integer) TO service_role;
