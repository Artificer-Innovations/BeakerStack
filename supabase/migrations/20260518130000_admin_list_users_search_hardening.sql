-- admin_is_admin reads mutable admin_users; must not be STABLE (cached within a transaction).
ALTER FUNCTION public.admin_is_admin() VOLATILE;

-- Cap and escape admin_list_users search; avoid unbounded ILIKE and wildcard abuse.

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
