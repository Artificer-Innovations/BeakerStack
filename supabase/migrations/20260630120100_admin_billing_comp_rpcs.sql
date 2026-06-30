-- Admin RPCs: grant / revoke complimentary billing access.

-- ---------------------------------------------------------------------------
-- RPC: grant complimentary billing plan
-- ---------------------------------------------------------------------------

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
    v_reason text;
    v_sub public.billing_subscriptions;
    v_free_plan_id text;
    v_period_start timestamptz;
    v_period_end timestamptz;
    v_existing_grant public.billing_comp_grants;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF p_user_id IS NULL OR p_product_id IS NULL OR p_plan_id IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    v_reason := nullif(btrim(p_reason), '');
    IF v_reason IS NULL OR char_length(v_reason) > 500 THEN
        RETURN jsonb_build_object('error', 'invalid_reason');
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
    WHERE s.user_id = p_user_id AND s.product_id = p_product_id;

    IF v_sub.stripe_subscription_id IS NOT NULL THEN
        RETURN jsonb_build_object('error', 'stripe_subscription_active');
    END IF;

    v_period_start := date_trunc('month', now() AT TIME ZONE 'utc');
    v_period_end := v_period_start + interval '1 month';

    SELECT * INTO v_existing_grant
    FROM public.billing_comp_grants g
    WHERE g.user_id = p_user_id
      AND g.product_id = p_product_id
      AND g.revoked_at IS NULL;

    IF FOUND THEN
        IF v_existing_grant.plan_id = p_plan_id
           AND v_sub.status = 'comped'
           AND v_sub.plan_id = p_plan_id
           AND (v_existing_grant.comp_expires_at IS NOT DISTINCT FROM p_expires_at) THEN
            RETURN jsonb_build_object('ok', true, 'unchanged', true);
        END IF;
        UPDATE public.billing_comp_grants g
        SET revoked_at = now(),
            revoked_by = v_uid,
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
    WHERE s.user_id = p_user_id AND s.product_id = p_product_id;

    INSERT INTO public.billing_comp_grants (
        user_id, product_id, plan_id, comped_by, comp_reason, comp_expires_at
    )
    VALUES (
        p_user_id, p_product_id, p_plan_id, v_uid, v_reason, p_expires_at
    );

    PERFORM public._admin_insert_audit(
        v_uid,
        'admin.billing.comp.grant',
        'user',
        p_user_id::text,
        jsonb_build_object(
            'product_id', p_product_id,
            'plan_id', p_plan_id,
            'expires_at', p_expires_at,
            'reason', left(v_reason, 200)
        )
    );

    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_billing_comp(uuid, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_billing_comp(uuid, text, text, text, timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: revoke complimentary billing
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_revoke_billing_comp(
    p_user_id uuid,
    p_product_id text,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_free_plan_id text;
    v_grant public.billing_comp_grants;
    v_has_active_grant boolean;
    v_revoke_plan_id text;
    v_revoke_reason text;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF p_user_id IS NULL OR p_product_id IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT * INTO v_grant
    FROM public.billing_comp_grants g
    WHERE g.user_id = p_user_id
      AND g.product_id = p_product_id
      AND g.revoked_at IS NULL;

    v_has_active_grant := FOUND;

    IF NOT v_has_active_grant
       AND NOT EXISTS (
            SELECT 1 FROM public.billing_subscriptions s
            WHERE s.user_id = p_user_id
              AND s.product_id = p_product_id
              AND s.status = 'comped'
        ) THEN
        RETURN jsonb_build_object('ok', true, 'unchanged', true);
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

    v_revoke_reason := nullif(btrim(p_reason), '');
    IF v_revoke_reason IS NOT NULL AND char_length(v_revoke_reason) > 500 THEN
        RETURN jsonb_build_object('error', 'invalid_reason');
    END IF;

    IF v_has_active_grant THEN
        v_revoke_plan_id := v_grant.plan_id;
        UPDATE public.billing_comp_grants g
        SET revoked_at = now(),
            revoked_by = v_uid,
            revoke_reason = v_revoke_reason,
            updated_at = now()
        WHERE g.id = v_grant.id;
    ELSE
        SELECT s.plan_id INTO v_revoke_plan_id
        FROM public.billing_subscriptions s
        WHERE s.user_id = p_user_id AND s.product_id = p_product_id;
    END IF;

    UPDATE public.billing_subscriptions s
    SET plan_id = v_free_plan_id,
        status = 'free',
        stripe_subscription_id = NULL,
        current_period_start = date_trunc('month', now() AT TIME ZONE 'utc'),
        current_period_end = date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month',
        updated_at = now()
    WHERE s.user_id = p_user_id
      AND s.product_id = p_product_id
      AND s.stripe_subscription_id IS NULL
      AND (
          s.status = 'comped'
          OR (v_has_active_grant AND s.plan_id = v_grant.plan_id)
      );

    PERFORM public._admin_insert_audit(
        v_uid,
        'admin.billing.comp.revoke',
        'user',
        p_user_id::text,
        jsonb_build_object(
            'product_id', p_product_id,
            'plan_id', v_revoke_plan_id
        )
    );

    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_billing_comp(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_billing_comp(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Extend admin_get_user with active comp grant (admin-only metadata)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_user(
    p_user_id uuid,
    p_product_id text DEFAULT 'beakerstack'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_auth jsonb;
    v_profile jsonb;
    v_subscription jsonb;
    v_plan_id text;
    v_plan jsonb;
    v_usage_aggregates jsonb;
    v_usage_events jsonb;
    v_invoices jsonb;
    v_is_admin boolean;
    v_granted_at timestamptz;
    v_granted_by_email text;
    v_comp_grant jsonb;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'email_confirmed_at', u.email_confirmed_at
    )
    INTO v_auth
    FROM auth.users u
    WHERE u.id = p_user_id;

    IF v_auth IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    PERFORM public._admin_insert_audit(
        v_uid,
        'admin.users.view',
        'user',
        p_user_id::text,
        jsonb_build_object('product_id', p_product_id)
    );

    SELECT
        au.granted_at,
        granter.email
    INTO v_granted_at, v_granted_by_email
    FROM public.admin_users au
    LEFT JOIN auth.users granter ON granter.id = au.granted_by
    WHERE au.user_id = p_user_id AND au.revoked_at IS NULL;

    v_is_admin := FOUND;

    SELECT jsonb_build_object(
        'display_name', p.display_name,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'bio', p.bio,
        'website', p.website,
        'location', p.location,
        'created_at', p.created_at,
        'updated_at', p.updated_at
    )
    INTO v_profile
    FROM public.user_profiles p
    WHERE p.user_id = p_user_id;

    SELECT
        jsonb_build_object(
            'product_id', s.product_id,
            'plan_id', s.plan_id,
            'status', s.status,
            'current_period_start', s.current_period_start,
            'current_period_end', s.current_period_end,
            'cancel_at_period_end', s.cancel_at_period_end,
            'canceled_at', s.canceled_at,
            'trial_start', s.trial_start,
            'trial_end', s.trial_end,
            'created_at', s.created_at,
            'updated_at', s.updated_at
        ),
        s.plan_id
    INTO v_subscription, v_plan_id
    FROM public.billing_subscriptions s
    WHERE s.user_id = p_user_id AND s.product_id = p_product_id;

    IF v_plan_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'id', pl.id,
            'display_name', pl.display_name,
            'description', pl.description,
            'price_cents', pl.price_cents,
            'billing_period', pl.billing_period,
            'features', pl.features,
            'usage_limits', pl.usage_limits,
            'trial_period_days', pl.trial_period_days,
            'is_public', pl.is_public,
            'display_order', pl.display_order
        )
        INTO v_plan
        FROM public.billing_plans pl
        WHERE pl.id = v_plan_id;
    END IF;

    SELECT jsonb_build_object(
        'id', g.id,
        'plan_id', g.plan_id,
        'comped_at', g.comped_at,
        'comped_by', g.comped_by,
        'comped_by_email', granter.email,
        'comp_reason', g.comp_reason,
        'comp_expires_at', g.comp_expires_at
    )
    INTO v_comp_grant
    FROM public.billing_comp_grants g
    LEFT JOIN auth.users granter ON granter.id = g.comped_by
    WHERE g.user_id = p_user_id
      AND g.product_id = p_product_id
      AND g.revoked_at IS NULL;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'event_type', a.event_type,
                'product_id', a.product_id,
                'period_start', a.period_start,
                'period_end', a.period_end,
                'count', a.count
            )
            ORDER BY a.event_type
        ),
        '[]'::jsonb
    )
    INTO v_usage_aggregates
    FROM public.billing_usage_aggregates a
    WHERE a.user_id = p_user_id
      AND a.product_id = p_product_id
      AND a.period_start <= now()
      AND a.period_end > now();

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'event_type', e.event_type,
                'product_id', e.product_id,
                'quantity', e.quantity,
                'created_at', e.created_at
            )
            ORDER BY e.created_at DESC
        ),
        '[]'::jsonb
    )
    INTO v_usage_events
    FROM (
        SELECT e.event_type, e.product_id, e.quantity, e.created_at
        FROM public.billing_usage_events e
        WHERE e.user_id = p_user_id
          AND e.product_id = p_product_id
        ORDER BY e.created_at DESC
        LIMIT 100
    ) e;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', i.id,
                'stripe_invoice_id', i.stripe_invoice_id,
                'status', i.status,
                'amount_due', i.amount_due,
                'amount_paid', i.amount_paid,
                'currency', i.currency,
                'description', i.description,
                'hosted_invoice_url', i.hosted_invoice_url,
                'period_start', i.period_start,
                'period_end', i.period_end,
                'created_at', i.created_at,
                'finalized_at', i.finalized_at,
                'paid_at', i.paid_at
            )
            ORDER BY i.created_at DESC
        ),
        '[]'::jsonb
    )
    INTO v_invoices
    FROM (
        SELECT
            i.id,
            i.stripe_invoice_id,
            i.status,
            i.amount_due,
            i.amount_paid,
            i.currency,
            i.description,
            i.hosted_invoice_url,
            i.period_start,
            i.period_end,
            i.created_at,
            i.finalized_at,
            i.paid_at
        FROM public.billing_invoices i
        WHERE i.user_id = p_user_id
        ORDER BY i.created_at DESC
        LIMIT 20
    ) i;

    RETURN jsonb_build_object(
        'auth', v_auth,
        'profile', v_profile,
        'subscription', v_subscription,
        'plan', v_plan,
        'comp_grant', v_comp_grant,
        'admin', jsonb_build_object(
            'is_admin', v_is_admin,
            'granted_at', v_granted_at,
            'granted_by_email', v_granted_by_email
        ),
        'usage_aggregates', v_usage_aggregates,
        'usage_events', v_usage_events,
        'invoices', v_invoices
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user(uuid, text) TO authenticated;
