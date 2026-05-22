-- Admin v2: expose is_admin in read RPCs; add grant/revoke operator RPCs.

-- ---------------------------------------------------------------------------
-- Extend admin_list_users: add is_admin computed field via LEFT JOIN
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_users(
    p_limit integer DEFAULT 25,
    p_offset integer DEFAULT 0,
    p_search text DEFAULT NULL,
    p_sort text DEFAULT 'signup',
    p_sort_dir text DEFAULT 'desc',
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
    v_total bigint;
    v_rows jsonb;
    v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
    v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
    v_search text;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF p_search IS NULL OR length(trim(p_search)) = 0 THEN
        v_search := NULL;
    ELSE
        v_search := left(
            replace(
                replace(replace(trim(p_search), '\', '\\'), '%', '\%'),
                '_',
                '\_'
            ),
            200
        );
    END IF;

    PERFORM public._admin_insert_audit(
        v_uid,
        'admin.users.list',
        'users',
        NULL,
        jsonb_build_object(
            'limit', v_limit,
            'offset', v_offset,
            'search', v_search,
            'sort', p_sort,
            'sort_dir', p_sort_dir,
            'product_id', p_product_id
        )
    );

    SELECT count(*)::bigint INTO v_total
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.user_id = u.id
    WHERE v_search IS NULL
       OR u.email ILIKE '%' || v_search || '%' ESCAPE '\';

    SELECT COALESCE(jsonb_agg(t.row_data), '[]'::jsonb)
    INTO v_rows
    FROM (
        SELECT jsonb_build_object(
            'user_id', u.id,
            'email', u.email,
            'display_name', p.display_name,
            'username', p.username,
            'signup_at', u.created_at,
            'last_active_at', COALESCE(u.last_sign_in_at, p.updated_at),
            'plan_id', sub.plan_id,
            'subscription_status', sub.status,
            'plan_display_name', pl.display_name,
            'is_admin', (au.user_id IS NOT NULL),
            'usage_current_period', (
                SELECT COALESCE(jsonb_object_agg(a.event_type, a.count), '{}'::jsonb)
                FROM public.billing_usage_aggregates a
                WHERE a.user_id = u.id
                  AND a.product_id = p_product_id
                  AND a.period_start <= now()
                  AND a.period_end > now()
            )
        ) AS row_data
        FROM auth.users u
        LEFT JOIN public.user_profiles p ON p.user_id = u.id
        LEFT JOIN public.billing_subscriptions sub
            ON sub.user_id = u.id AND sub.product_id = p_product_id
        LEFT JOIN public.billing_plans pl ON pl.id = sub.plan_id
        LEFT JOIN public.admin_users au ON au.user_id = u.id AND au.revoked_at IS NULL
        WHERE v_search IS NULL
           OR u.email ILIKE '%' || v_search || '%' ESCAPE '\'
        ORDER BY
            CASE WHEN COALESCE(p_sort_dir, 'desc') = 'asc' THEN
                CASE
                    WHEN COALESCE(p_sort, 'signup') = 'last_active' THEN
                        COALESCE(u.last_sign_in_at, p.updated_at, u.created_at)
                    ELSE u.created_at
                END
            END ASC NULLS LAST,
            CASE WHEN COALESCE(p_sort_dir, 'desc') = 'desc' THEN
                CASE
                    WHEN COALESCE(p_sort, 'signup') = 'last_active' THEN
                        COALESCE(u.last_sign_in_at, p.updated_at, u.created_at)
                    ELSE u.created_at
                END
            END DESC NULLS LAST
        LIMIT v_limit
        OFFSET v_offset
    ) t;

    RETURN jsonb_build_object(
        'users', v_rows,
        'total', v_total,
        'limit', v_limit,
        'offset', v_offset
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- Extend admin_get_user: add admin section { is_admin, granted_at, granted_by_email }
-- granted_by_email resolved via join so operators see a readable identity.
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

    -- Resolve admin status and granter email in one pass
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

-- ---------------------------------------------------------------------------
-- RPC: grant operator
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_grant_operator(p_user_id uuid)
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

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    -- Upsert: clear revoked_at and update granter on re-grant
    INSERT INTO public.admin_users (user_id, granted_by, granted_at, revoked_at)
    VALUES (p_user_id, v_uid, now(), NULL)
    ON CONFLICT (user_id) DO UPDATE
        SET granted_by = EXCLUDED.granted_by,
            granted_at = EXCLUDED.granted_at,
            revoked_at = NULL;

    PERFORM public._admin_insert_audit(
        v_uid,
        'admin.operator.grant',
        'user',
        p_user_id::text,
        '{}'::jsonb
    );

    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_operator(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_operator(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: revoke operator
-- Idempotent: no-op when target is not an active admin.
-- Rejects self-revoke with a distinct error code.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_revoke_operator(p_user_id uuid)
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

    IF p_user_id = v_uid THEN
        RETURN jsonb_build_object('error', 'cannot_self_revoke');
    END IF;

    UPDATE public.admin_users
    SET revoked_at = now()
    WHERE user_id = p_user_id AND revoked_at IS NULL;

    IF FOUND THEN
        PERFORM public._admin_insert_audit(
            v_uid,
            'admin.operator.revoke',
            'user',
            p_user_id::text,
            '{}'::jsonb
        );
    END IF;

    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_operator(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_operator(uuid) TO authenticated;
