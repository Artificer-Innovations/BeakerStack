-- Allow finding non-discoverable users only on exact username match (case-insensitive).
-- Fuzzy / prefix / display-name search still requires is_discoverable = true.

CREATE OR REPLACE FUNCTION public.connections_search_users(
    p_query text,
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    user_id uuid,
    username text,
    display_name text,
    avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
    v_raw text := btrim(COALESCE(p_query, ''));
    v_q text;
    v_exact text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    IF length(v_raw) < 2 THEN
        RETURN;
    END IF;

    -- Optional leading @ when sharing a handle
    IF left(v_raw, 1) = '@' THEN
        v_raw := btrim(substring(v_raw from 2));
    END IF;

    IF length(v_raw) < 2 THEN
        RETURN;
    END IF;

    v_exact := lower(v_raw);
    v_q := replace(replace(replace(v_raw, '\', '\\'), '%', '\%'), '_', '\_');

    RETURN QUERY
    SELECT
        p.user_id,
        p.username,
        p.display_name,
        p.avatar_url
    FROM public.user_profiles p
    WHERE p.user_id <> v_uid
      AND (
          lower(p.username) = v_exact
          OR (
              COALESCE(p.is_discoverable, true) = true
              AND (
                  p.username ILIKE v_q || '%' ESCAPE '\'
                  OR p.display_name ILIKE '%' || v_q || '%' ESCAPE '\'
                  OR p.username % v_raw
                  OR p.display_name % v_raw
              )
          )
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.bs_connections c
          WHERE c.user_low = LEAST(v_uid, p.user_id)
            AND c.user_high = GREATEST(v_uid, p.user_id)
            AND c.status = 'blocked'
      )
    ORDER BY
        CASE WHEN lower(p.username) = v_exact THEN 0
             WHEN p.username ILIKE v_q || '%' ESCAPE '\' THEN 1
             ELSE 2
        END,
        p.username
    LIMIT v_limit;
END;
$$;
