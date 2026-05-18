-- BeakerStack Admin v1: operator role, audit log, admin RPCs

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    granted_at timestamptz NOT NULL DEFAULT now(),
    granted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_users_active
    ON public.admin_users (user_id)
    WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    action text NOT NULL,
    target_type text,
    target_id text,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
    ON public.admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
    ON public.admin_audit_log (actor_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: enabled, no policies for anon/authenticated (service role + SECURITY DEFINER only)
-- ---------------------------------------------------------------------------

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_is_admin()
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users a
        WHERE a.user_id = auth.uid()
          AND a.revoked_at IS NULL
    );
$$;

-- Internal only: not exposed to PostgREST (REVOKE ALL FROM PUBLIC).
CREATE OR REPLACE FUNCTION public._admin_insert_audit(
    p_actor uuid,
    p_action text,
    p_target_type text,
    p_target_id text,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.admin_audit_log (
        actor_user_id, action, target_type, target_id, details
    )
    VALUES (p_actor, p_action, p_target_type, p_target_id, COALESCE(p_details, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public._admin_insert_audit(uuid, text, text, text, jsonb) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- RPC: record audit event (for custom admin features)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_record_audit_event(
    p_action text,
    p_target_type text DEFAULT NULL,
    p_target_id text DEFAULT NULL,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN;
    END IF;

    PERFORM public._admin_insert_audit(
        v_uid, p_action, p_target_type, p_target_id, p_details
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_record_audit_event(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_record_audit_event(text, text, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: list users (paginated)
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

REVOKE ALL ON FUNCTION public.admin_list_users(integer, integer, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users(integer, integer, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: get user detail
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
    v_plan jsonb;
    v_usage_aggregates jsonb;
    v_usage_events jsonb;
    v_invoices jsonb;
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

    SELECT to_jsonb(p.*) INTO v_profile
    FROM public.user_profiles p
    WHERE p.user_id = p_user_id;

    SELECT to_jsonb(s.*) INTO v_subscription
    FROM public.billing_subscriptions s
    WHERE s.user_id = p_user_id AND s.product_id = p_product_id;

    IF v_subscription IS NOT NULL THEN
        SELECT to_jsonb(pl.*) INTO v_plan
        FROM public.billing_plans pl
        WHERE pl.id = v_subscription ->> 'plan_id';
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(a.*) ORDER BY a.event_type), '[]'::jsonb)
    INTO v_usage_aggregates
    FROM public.billing_usage_aggregates a
    WHERE a.user_id = p_user_id
      AND a.product_id = p_product_id
      AND a.period_start <= now()
      AND a.period_end > now();

    SELECT COALESCE(jsonb_agg(to_jsonb(e.*) ORDER BY e.created_at DESC), '[]'::jsonb)
    INTO v_usage_events
    FROM (
        SELECT *
        FROM public.billing_usage_events e
        WHERE e.user_id = p_user_id
          AND e.product_id = p_product_id
        ORDER BY e.created_at DESC
        LIMIT 100
    ) e;

    SELECT COALESCE(jsonb_agg(to_jsonb(i.*) ORDER BY i.created_at DESC), '[]'::jsonb)
    INTO v_invoices
    FROM (
        SELECT *
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
        'usage_aggregates', v_usage_aggregates,
        'usage_events', v_usage_events,
        'invoices', v_invoices
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_is_admin() TO authenticated;

COMMENT ON TABLE public.admin_users IS 'App-wide operator admins; grant/revoke via service role CLI only.';
COMMENT ON TABLE public.admin_audit_log IS 'Append-only admin action audit trail; no client delete/update in v1.';
