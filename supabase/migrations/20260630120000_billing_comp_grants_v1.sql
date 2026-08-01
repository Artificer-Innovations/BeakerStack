-- Complimentary billing grants: admin-only metadata table + free-plan provisioning fix.

-- ---------------------------------------------------------------------------
-- billing_comp_grants (no authenticated RLS — admin RPCs only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_comp_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES public.billing_products (id) ON DELETE CASCADE,
    plan_id text NOT NULL REFERENCES public.billing_plans (id) ON DELETE RESTRICT,
    comped_at timestamptz NOT NULL DEFAULT now(),
    comped_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    comp_reason text NOT NULL,
    comp_expires_at timestamptz,
    revoked_at timestamptz,
    revoked_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    revoke_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT billing_comp_grants_reason_len CHECK (char_length(comp_reason) <= 500),
    CONSTRAINT billing_comp_grants_revoke_reason_len CHECK (
        revoke_reason IS NULL OR char_length(revoke_reason) <= 500
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_comp_grants_active_user_product
    ON public.billing_comp_grants (user_id, product_id)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS billing_comp_grants_user_product
    ON public.billing_comp_grants (user_id, product_id);

ALTER TABLE public.billing_comp_grants ENABLE ROW LEVEL SECURITY;

-- updated_at is set explicitly in admin grant/revoke RPCs (no public.set_updated_at in template migrations)

-- ---------------------------------------------------------------------------
-- ensure_billing_subscription: only auto-provision the public free plan
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
      AND p.billing_period = 'free'
      AND p.is_public = true
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
