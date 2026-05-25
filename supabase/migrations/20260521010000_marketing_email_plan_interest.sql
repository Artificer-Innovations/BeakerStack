-- Phase 3: propagate plan_id from auth.users signup metadata into queue payload.
-- Updates the trigger function created in 20260520200000_marketing_email_v1.sql.
-- plan_id is omitted from the payload when not present in raw_user_meta_data.

CREATE OR REPLACE FUNCTION public._marketing_email_on_user_signed_up()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_product_id text;
  v_payload    jsonb;
  v_plan_id    text;
BEGIN
  SELECT product_id INTO v_product_id
    FROM public.marketing_email_settings
    WHERE enabled = true
    ORDER BY product_id
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  v_plan_id := NEW.raw_user_meta_data->>'plan_id';

  v_payload := jsonb_build_object('user_id', NEW.id, 'created_at', NEW.created_at);
  IF v_plan_id IS NOT NULL AND v_plan_id <> '' THEN
    v_payload := v_payload || jsonb_build_object('plan_id', v_plan_id);
  END IF;

  INSERT INTO public.marketing_email_sync_queue
    (product_id, event_type, email, payload, idempotency_key)
  VALUES (
    v_product_id,
    'user.signed_up',
    lower(trim(NEW.email)),
    v_payload,
    'user.signed_up:' || NEW.id::text
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._marketing_email_on_user_signed_up() FROM PUBLIC;
