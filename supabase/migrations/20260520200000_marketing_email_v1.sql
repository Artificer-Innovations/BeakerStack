-- marketing_email_settings: feature flag + config per product
CREATE TABLE public.marketing_email_settings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  text        NOT NULL UNIQUE,
  enabled     boolean     NOT NULL DEFAULT false,
  provider    text        NOT NULL DEFAULT 'kit',
  config      jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_email_settings ENABLE ROW LEVEL SECURITY;

-- marketing_email_sync_queue: lifecycle events waiting to sync to the email provider
CREATE TABLE public.marketing_email_sync_queue (
  id                bigserial   PRIMARY KEY,
  product_id        text        NOT NULL,
  event_type        text        NOT NULL,
  email             text        NOT NULL,
  payload           jsonb       NOT NULL DEFAULT '{}',
  idempotency_key   text        UNIQUE,
  status            text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts          int         NOT NULL DEFAULT 0,
  last_attempted_at timestamptz,
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz
);

CREATE INDEX public_marketing_email_sync_queue_pending_idx
  ON public.marketing_email_sync_queue (created_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.marketing_email_sync_queue ENABLE ROW LEVEL SECURITY;

-- marketing_email_unsubscribes: local mirror of provider unsubscribes for fast lookup
CREATE TABLE public.marketing_email_unsubscribes (
  id         bigserial   PRIMARY KEY,
  email      text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Trigger: enqueue user.signed_up for every new auth user when marketing email is enabled.
-- SECURITY DEFINER with fixed search_path guards against search_path hijacking.
CREATE OR REPLACE FUNCTION public._marketing_email_on_user_signed_up()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_product_id text;
BEGIN
  SELECT product_id INTO v_product_id
    FROM public.marketing_email_settings
    WHERE enabled = true
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.marketing_email_sync_queue
    (product_id, event_type, email, payload, idempotency_key)
  VALUES (
    v_product_id,
    'user.signed_up',
    NEW.email,
    jsonb_build_object('user_id', NEW.id, 'created_at', NEW.created_at),
    'user.signed_up:' || NEW.id::text
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER marketing_email_user_signed_up
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public._marketing_email_on_user_signed_up();
