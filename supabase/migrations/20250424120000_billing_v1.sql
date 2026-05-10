-- BeakerStack Billing v1: products, plans, subscriptions, usage, webhooks, RPCs

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_products (
    id text PRIMARY KEY,
    display_name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_plans (
    id text PRIMARY KEY,
    product_id text NOT NULL REFERENCES public.billing_products (id) ON DELETE CASCADE,
    display_name text NOT NULL,
    description text,
    price_cents integer NOT NULL DEFAULT 0,
    billing_period text NOT NULL,
    stripe_price_id text,
    stripe_product_id text,
    features jsonb NOT NULL DEFAULT '{}'::jsonb,
    usage_limits jsonb NOT NULL DEFAULT '{}'::jsonb,
    trial_period_days integer NOT NULL DEFAULT 0,
    is_public boolean NOT NULL DEFAULT true,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_plans_product ON public.billing_plans (product_id);

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES public.billing_products (id) ON DELETE CASCADE,
    plan_id text NOT NULL REFERENCES public.billing_plans (id) ON DELETE RESTRICT,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text NOT NULL,
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    canceled_at timestamptz,
    trial_start timestamptz,
    trial_end timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user_product ON public.billing_subscriptions (user_id, product_id);

CREATE TABLE IF NOT EXISTS public.billing_usage_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES public.billing_products (id) ON DELETE CASCADE,
    event_type text NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_usage_events_lookup ON public.billing_usage_events (user_id, product_id, event_type, created_at);

CREATE TABLE IF NOT EXISTS public.billing_usage_aggregates (
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES public.billing_products (id) ON DELETE CASCADE,
    event_type text NOT NULL,
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    count integer NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, product_id, event_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_billing_usage_aggregates_lookup ON public.billing_usage_aggregates (user_id, product_id, event_type, period_start);

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id text NOT NULL UNIQUE,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed boolean NOT NULL DEFAULT false,
    processed_at timestamptz,
    error text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Server-side demo flag (defense in depth with client env). Local seed may set true.
CREATE TABLE IF NOT EXISTS public.billing_system_flags (
    key text PRIMARY KEY,
    value boolean NOT NULL DEFAULT false
);

INSERT INTO public.billing_system_flags (key, value)
VALUES ('demo_billing_mode', false)
ON CONFLICT (key) DO NOTHING;

CREATE TRIGGER billing_plans_updated_at
    BEFORE UPDATE ON public.billing_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER billing_subscriptions_updated_at
    BEFORE UPDATE ON public.billing_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_system_flags ENABLE ROW LEVEL SECURITY;

-- Products & plans: readable by any authenticated user
CREATE POLICY "billing_products_select_authenticated"
    ON public.billing_products FOR SELECT TO authenticated USING (true);

CREATE POLICY "billing_plans_select_authenticated"
    ON public.billing_plans FOR SELECT TO authenticated USING (true);

-- Subscriptions: own rows only, select only (mutations via Edge / SECURITY DEFINER RPCs)
CREATE POLICY "billing_subscriptions_select_own"
    ON public.billing_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Usage: own select only
CREATE POLICY "billing_usage_events_select_own"
    ON public.billing_usage_events FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "billing_usage_aggregates_select_own"
    ON public.billing_usage_aggregates FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Webhook log: service role only (no policies for authenticated = deny)
-- System flags: deny direct access for authenticated (RPCs use SECURITY DEFINER)

-- ---------------------------------------------------------------------------
-- Helper: usage period window for a subscription row
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.billing_usage_period(p_sub public.billing_subscriptions)
RETURNS TABLE (period_start timestamptz, period_end timestamptz)
LANGUAGE sql
STABLE
AS $$
    SELECT
        CASE
            WHEN p_sub.stripe_subscription_id IS NULL
                OR lower(p_sub.status) = 'free' THEN date_trunc('month', now() AT TIME ZONE 'utc')
            ELSE coalesce(p_sub.current_period_start, date_trunc('month', now() AT TIME ZONE 'utc'))
        END AS period_start,
        CASE
            WHEN p_sub.stripe_subscription_id IS NULL
                OR lower(p_sub.status) = 'free' THEN (date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month')
            ELSE coalesce(p_sub.current_period_end, (date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month'))
        END AS period_end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: ensure free-tier subscription (idempotent)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_billing_subscription(p_product_id text)
RETURNS public.billing_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_free_plan_id text;
    r public.billing_subscriptions;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT p.id INTO v_free_plan_id
    FROM public.billing_plans p
    WHERE p.product_id = p_product_id
      AND p.price_cents = 0
    ORDER BY p.display_order NULLS LAST, p.id
    LIMIT 1;

    IF v_free_plan_id IS NULL THEN
        RAISE EXCEPTION 'no free plan for product %', p_product_id;
    END IF;

    INSERT INTO public.billing_subscriptions (
        user_id, product_id, plan_id, status,
        stripe_customer_id, stripe_subscription_id,
        current_period_start, current_period_end
    )
    VALUES (
        v_uid, p_product_id, v_free_plan_id, 'free',
        NULL, NULL,
        date_trunc('month', now() AT TIME ZONE 'utc'),
        date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month'
    )
    ON CONFLICT (user_id, product_id) DO NOTHING;

    SELECT * INTO r FROM public.billing_subscriptions s
    WHERE s.user_id = v_uid AND s.product_id = p_product_id;

    RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_billing_subscription(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_billing_subscription(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: record usage (insert event + bump aggregate)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.billing_record_usage_event(
    p_product_id text,
    p_event_type text,
    p_quantity integer DEFAULT 1,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    sub public.billing_subscriptions;
    w record;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT * INTO sub FROM public.billing_subscriptions s
    WHERE s.user_id = v_uid AND s.product_id = p_product_id;

    IF NOT FOUND THEN
        PERFORM public.ensure_billing_subscription(p_product_id);
        SELECT * INTO sub FROM public.billing_subscriptions s
        WHERE s.user_id = v_uid AND s.product_id = p_product_id;
    END IF;

    SELECT * INTO w FROM public.billing_usage_period(sub);

    INSERT INTO public.billing_usage_events (user_id, product_id, event_type, quantity, metadata)
    VALUES (v_uid, p_product_id, p_event_type, coalesce(p_quantity, 1), coalesce(p_metadata, '{}'::jsonb));

    INSERT INTO public.billing_usage_aggregates (user_id, product_id, event_type, period_start, period_end, count)
    VALUES (v_uid, p_product_id, p_event_type, w.period_start, w.period_end, coalesce(p_quantity, 1))
    ON CONFLICT (user_id, product_id, event_type, period_start)
    DO UPDATE SET count = public.billing_usage_aggregates.count + excluded.count,
                  period_end = excluded.period_end;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_record_usage_event(text, text, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_record_usage_event(text, text, integer, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: remaining usage (used / limit / remaining / period_end)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.billing_get_remaining_usage(p_product_id text, p_event_type text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    sub public.billing_subscriptions;
    w record;
    lim int;
    used int := 0;
    plan_limits jsonb;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('error', 'unauthenticated');
    END IF;

    SELECT * INTO sub FROM public.billing_subscriptions s
    WHERE s.user_id = v_uid AND s.product_id = p_product_id;

    IF NOT FOUND THEN
        PERFORM public.ensure_billing_subscription(p_product_id);
        SELECT * INTO sub FROM public.billing_subscriptions s
        WHERE s.user_id = v_uid AND s.product_id = p_product_id;
    END IF;

    SELECT pl.usage_limits INTO plan_limits
    FROM public.billing_plans pl
    WHERE pl.id = sub.plan_id;

    IF plan_limits ? p_event_type THEN
        lim := (plan_limits ->> p_event_type)::integer;
    ELSE
        lim := NULL; -- unlimited
    END IF;

    IF lim IS NOT NULL AND lim < 0 THEN
        lim := NULL; -- convention: negative = unlimited
    END IF;

    SELECT * INTO w FROM public.billing_usage_period(sub);

    SELECT coalesce(a.count, 0) INTO used
    FROM public.billing_usage_aggregates a
    WHERE a.user_id = v_uid
      AND a.product_id = p_product_id
      AND a.event_type = p_event_type
      AND a.period_start = w.period_start;

    RETURN jsonb_build_object(
        'used', used,
        'limit', lim,
        'remaining', CASE WHEN lim IS NULL THEN NULL ELSE greatest(lim - used, 0) END,
        'periodEnd', w.period_end,
        'periodStart', w.period_start
    );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_get_remaining_usage(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_get_remaining_usage(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.billing_has_exceeded_limit(p_product_id text, p_event_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH j AS (
        SELECT public.billing_get_remaining_usage(p_product_id, p_event_type) AS u
    )
    SELECT CASE
        WHEN (j.u ->> 'error') IS NOT NULL THEN false
        WHEN (j.u -> 'limit') IS NULL OR jsonb_typeof(j.u -> 'limit') = 'null' THEN false
        ELSE (j.u ->> 'used')::integer >= (j.u ->> 'limit')::integer
    END
    FROM j;
$$;

REVOKE ALL ON FUNCTION public.billing_has_exceeded_limit(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_has_exceeded_limit(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Demo RPCs (gated by billing_system_flags.demo_billing_mode)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.billing_demo_mode_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT coalesce(
        (SELECT value FROM public.billing_system_flags WHERE key = 'demo_billing_mode'),
        false
    );
$$;

REVOKE ALL ON FUNCTION public.billing_demo_mode_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_demo_mode_enabled() TO authenticated;

CREATE OR REPLACE FUNCTION public.billing_demo_simulate_upgrade(p_product_id text, p_plan_id text)
RETURNS public.billing_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    r public.billing_subscriptions;
BEGIN
    IF NOT public.billing_demo_mode_enabled() THEN
        RAISE EXCEPTION 'demo billing disabled';
    END IF;
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.billing_plans pl WHERE pl.id = p_plan_id AND pl.product_id = p_product_id) THEN
        RAISE EXCEPTION 'invalid plan';
    END IF;

    PERFORM public.ensure_billing_subscription(p_product_id);

    UPDATE public.billing_subscriptions s
    SET plan_id = p_plan_id,
        status = CASE
            WHEN (SELECT price_cents FROM public.billing_plans pl WHERE pl.id = p_plan_id) = 0 THEN 'free'
            ELSE 'active'
        END,
        stripe_subscription_id = NULL,
        stripe_customer_id = NULL,
        current_period_start = CASE
            WHEN (SELECT price_cents FROM public.billing_plans pl WHERE pl.id = p_plan_id) = 0 THEN date_trunc('month', now() AT TIME ZONE 'utc')
            ELSE now() AT TIME ZONE 'utc'
        END,
        current_period_end = CASE
            WHEN (SELECT price_cents FROM public.billing_plans pl WHERE pl.id = p_plan_id) = 0 THEN date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month'
            ELSE now() AT TIME ZONE 'utc' + interval '1 month'
        END,
        updated_at = now()
    WHERE s.user_id = v_uid AND s.product_id = p_product_id
    RETURNING * INTO r;

    RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_demo_simulate_upgrade(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_demo_simulate_upgrade(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.billing_demo_reset_usage(p_product_id text, p_event_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
BEGIN
    IF NOT public.billing_demo_mode_enabled() THEN
        RAISE EXCEPTION 'demo billing disabled';
    END IF;
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    DELETE FROM public.billing_usage_events e
    WHERE e.user_id = v_uid AND e.product_id = p_product_id AND e.event_type = p_event_type;

    DELETE FROM public.billing_usage_aggregates a
    WHERE a.user_id = v_uid AND a.product_id = p_product_id AND a.event_type = p_event_type;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_demo_reset_usage(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_demo_reset_usage(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_subscriptions;
ALTER TABLE public.billing_subscriptions REPLICA IDENTITY FULL;
