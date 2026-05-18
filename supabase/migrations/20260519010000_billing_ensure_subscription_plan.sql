-- Target a specific plan when provisioning (waitlist conversion)

CREATE OR REPLACE FUNCTION public.billing_ensure_subscription_plan(
    p_product_id text,
    p_plan_id text
)
RETURNS public.billing_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    r public.billing_subscriptions;
    v_plan public.billing_plans;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT * INTO v_plan
    FROM public.billing_plans p
    WHERE p.id = p_plan_id
      AND p.product_id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid plan % for product %', p_plan_id, p_product_id;
    END IF;

    INSERT INTO public.billing_subscriptions (
        user_id, product_id, plan_id, status,
        stripe_customer_id, stripe_subscription_id,
        current_period_start, current_period_end
    )
    VALUES (
        v_uid,
        p_product_id,
        p_plan_id,
        CASE WHEN v_plan.price_cents = 0 THEN 'free' ELSE 'active' END,
        NULL,
        NULL,
        date_trunc('month', now() AT TIME ZONE 'utc'),
        date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month'
    )
    ON CONFLICT (user_id, product_id) DO UPDATE
    SET
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        updated_at = now();

    SELECT * INTO r
    FROM public.billing_subscriptions s
    WHERE s.user_id = v_uid AND s.product_id = p_product_id;

    RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_ensure_subscription_plan(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_ensure_subscription_plan(text, text) TO authenticated, service_role;
