-- Extract internal comp-grant helper for admin + waitlist-billing integration paths.

CREATE OR REPLACE FUNCTION public._billing_apply_comp_grant(
    p_user_id uuid,
    p_product_id text,
    p_plan_id text,
    p_reason text,
    p_granted_by uuid DEFAULT NULL,
    p_expires_at timestamptz DEFAULT NULL,
    p_source text DEFAULT 'admin'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reason text;
    v_sub public.billing_subscriptions;
    v_free_plan_id text;
    v_period_start timestamptz;
    v_period_end timestamptz;
    v_existing_grant public.billing_comp_grants;
    v_source text;
BEGIN
    IF p_user_id IS NULL OR p_product_id IS NULL OR p_plan_id IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    v_reason := nullif(btrim(p_reason), '');
    IF v_reason IS NULL OR char_length(v_reason) > 500 THEN
        RETURN jsonb_build_object('error', 'invalid_reason');
    END IF;

    v_source := nullif(btrim(p_source), '');
    IF v_source IS NULL THEN
        v_source := 'admin';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.billing_plans pl
        WHERE pl.id = p_plan_id
          AND pl.product_id = p_product_id
          AND pl.is_public = false
    ) THEN
        RETURN jsonb_build_object('error', 'invalid_plan');
    END IF;

    SELECT p.id INTO v_free_plan_id
    FROM public.billing_plans p
    WHERE p.product_id = p_product_id
      AND p.billing_period = 'free'
      AND p.is_public = true
    ORDER BY p.display_order NULLS LAST, p.id
    LIMIT 1;

    IF v_free_plan_id IS NULL THEN
        RETURN jsonb_build_object('error', 'no_free_plan');
    END IF;

    INSERT INTO public.billing_subscriptions (
        user_id, product_id, plan_id, status,
        stripe_customer_id, stripe_subscription_id,
        current_period_start, current_period_end
    )
    VALUES (
        p_user_id, p_product_id, v_free_plan_id, 'free',
        NULL, NULL,
        date_trunc('month', now() AT TIME ZONE 'utc'),
        date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month'
    )
    ON CONFLICT (user_id, product_id) DO NOTHING;

    SELECT * INTO v_sub
    FROM public.billing_subscriptions s
    WHERE s.user_id = p_user_id AND s.product_id = p_product_id
    FOR UPDATE;

    IF v_sub.stripe_subscription_id IS NOT NULL THEN
        RETURN jsonb_build_object('error', 'stripe_subscription_active');
    END IF;

    IF v_sub.status = 'comped'
       AND v_sub.plan_id = p_plan_id
       AND EXISTS (
            SELECT 1 FROM public.billing_comp_grants g
            WHERE g.user_id = p_user_id
              AND g.product_id = p_product_id
              AND g.revoked_at IS NULL
              AND g.plan_id = p_plan_id
              AND (g.comp_expires_at IS NOT DISTINCT FROM p_expires_at)
        ) THEN
        RETURN jsonb_build_object('ok', true, 'unchanged', true);
    END IF;

    v_period_start := date_trunc('month', now() AT TIME ZONE 'utc');
    v_period_end := v_period_start + interval '1 month';

    SELECT * INTO v_existing_grant
    FROM public.billing_comp_grants g
    WHERE g.user_id = p_user_id
      AND g.product_id = p_product_id
      AND g.revoked_at IS NULL;

    IF FOUND THEN
        UPDATE public.billing_comp_grants g
        SET revoked_at = now(),
            revoked_by = p_granted_by,
            revoke_reason = 'superseded by new grant',
            updated_at = now()
        WHERE g.id = v_existing_grant.id;
    END IF;

    UPDATE public.billing_subscriptions s
    SET plan_id = p_plan_id,
        status = 'comped',
        stripe_subscription_id = NULL,
        current_period_start = v_period_start,
        current_period_end = v_period_end,
        cancel_at_period_end = false,
        canceled_at = NULL,
        pending_target_plan_id = NULL,
        updated_at = now()
    WHERE s.user_id = p_user_id
      AND s.product_id = p_product_id
      AND s.stripe_subscription_id IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'stripe_subscription_active');
    END IF;

    INSERT INTO public.billing_comp_grants (
        user_id, product_id, plan_id, comped_by, comp_reason, comp_expires_at
    )
    VALUES (
        p_user_id, p_product_id, p_plan_id, p_granted_by, v_reason, p_expires_at
    );

    IF p_granted_by IS NOT NULL THEN
        PERFORM public._admin_insert_audit(
            p_granted_by,
            'admin.billing.comp.grant',
            'user',
            p_user_id::text,
            jsonb_build_object(
                'product_id', p_product_id,
                'plan_id', p_plan_id,
                'expires_at', p_expires_at,
                'reason', left(v_reason, 200),
                'source', v_source
            )
        );
    END IF;

    RETURN jsonb_build_object('ok', true, 'comp_applied', true);
END;
$$;

REVOKE ALL ON FUNCTION public._billing_apply_comp_grant(uuid, text, text, text, uuid, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._billing_apply_comp_grant(uuid, text, text, text, uuid, timestamptz, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_grant_billing_comp(
    p_user_id uuid,
    p_product_id text,
    p_plan_id text,
    p_reason text,
    p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    RETURN public._billing_apply_comp_grant(
        p_user_id,
        p_product_id,
        p_plan_id,
        p_reason,
        v_uid,
        p_expires_at,
        'admin'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_billing_comp(uuid, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_billing_comp(uuid, text, text, text, timestamptz) TO authenticated;
