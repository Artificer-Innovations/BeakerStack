-- Replace is_discoverable boolean with connection_discoverability enum.

DO $$
BEGIN
    CREATE TYPE public.connection_discoverability AS ENUM (
        'searchable',
        'username_only',
        'hidden'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS connection_discoverability public.connection_discoverability;

UPDATE public.user_profiles
SET connection_discoverability = CASE
    WHEN is_discoverable = false THEN 'username_only'::public.connection_discoverability
    ELSE 'searchable'::public.connection_discoverability
END
WHERE connection_discoverability IS NULL
  AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'is_discoverable'
  );

UPDATE public.user_profiles
SET connection_discoverability = 'searchable'::public.connection_discoverability
WHERE connection_discoverability IS NULL;

ALTER TABLE public.user_profiles
    ALTER COLUMN connection_discoverability
    SET DEFAULT 'searchable'::public.connection_discoverability;

ALTER TABLE public.user_profiles
    ALTER COLUMN connection_discoverability
    SET NOT NULL;

DROP INDEX IF EXISTS public.idx_user_profiles_discoverable_username;

ALTER TABLE public.user_profiles
    DROP COLUMN IF EXISTS is_discoverable;

CREATE INDEX IF NOT EXISTS idx_user_profiles_searchable_username
    ON public.user_profiles (username)
    WHERE connection_discoverability = 'searchable';

-- ---------------------------------------------------------------------------
-- connections_request — reject new requests to hidden profiles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.connections_request(p_recipient_user_id uuid)
RETURNS TABLE (
    id uuid,
    status text,
    effective_status text,
    initiator_user_id uuid,
    recipient_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.bs_connections%ROWTYPE;
    v_eff text;
    v_disc public.connection_discoverability;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    IF p_recipient_user_id IS NULL THEN
        RAISE EXCEPTION 'recipient_user_id is required';
    END IF;

    IF p_recipient_user_id = v_uid THEN
        RAISE EXCEPTION 'cannot connect with yourself';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_recipient_user_id) THEN
        RAISE EXCEPTION 'recipient user not found';
    END IF;

    SELECT p.connection_discoverability
    INTO v_disc
    FROM public.user_profiles p
    WHERE p.user_id = p_recipient_user_id;

    IF COALESCE(v_disc, 'searchable') = 'hidden' THEN
        RAISE EXCEPTION 'user does not accept connection requests';
    END IF;

    IF public.connections_is_pair_blocked(v_uid, p_recipient_user_id) THEN
        RAISE EXCEPTION 'connection not allowed';
    END IF;

    PERFORM public.connections_assert_request_rate_limit();

    SELECT * INTO v_row
    FROM public.bs_connections c
    WHERE c.user_low = LEAST(v_uid, p_recipient_user_id)
      AND c.user_high = GREATEST(v_uid, p_recipient_user_id)
    FOR UPDATE;

    IF FOUND THEN
        v_eff := public.connections_effective_status(v_row.status, v_row.created_at);

        IF v_row.status = 'blocked' THEN
            RAISE EXCEPTION 'connection not allowed';
        END IF;

        IF v_row.status = 'accepted' THEN
            RAISE EXCEPTION 'already connected';
        END IF;

        IF v_row.status = 'pending' THEN
            IF v_eff = 'expired_pending' AND v_row.initiator_user_id = v_uid THEN
                UPDATE public.bs_connections c
                SET created_at = now()
                WHERE c.id = v_row.id
                RETURNING * INTO v_row;
                PERFORM public.connections_write_audit(
                    'requested', v_row.id, p_recipient_user_id, '{"renewed_expired_pending":true}'::jsonb
                );
                RETURN QUERY
                SELECT
                    v_row.id,
                    v_row.status,
                    public.connections_effective_status(v_row.status, v_row.created_at),
                    v_row.initiator_user_id,
                    v_row.recipient_user_id;
                RETURN;
            END IF;

            IF v_row.recipient_user_id = v_uid THEN
                UPDATE public.bs_connections c
                SET
                    status = 'accepted',
                    accepted_at = now(),
                    declined_at = NULL,
                    blocked_at = NULL,
                    disconnected_at = NULL,
                    blocked_by_user_id = NULL
                WHERE c.id = v_row.id
                RETURNING * INTO v_row;
                PERFORM public.connections_write_audit(
                    'accepted', v_row.id, p_recipient_user_id, '{"auto_accept":true}'::jsonb
                );
                RETURN QUERY
                SELECT
                    v_row.id,
                    v_row.status,
                    public.connections_effective_status(v_row.status, v_row.created_at),
                    v_row.initiator_user_id,
                    v_row.recipient_user_id;
                RETURN;
            END IF;

            RAISE EXCEPTION 'connection request already pending';
        END IF;

        IF v_row.status = 'declined' THEN
            IF v_row.initiator_user_id = v_uid THEN
                RAISE EXCEPTION 'connection request was declined';
            END IF;

            UPDATE public.bs_connections c
            SET
                initiator_user_id = v_uid,
                recipient_user_id = p_recipient_user_id,
                status = 'pending',
                created_at = now(),
                accepted_at = NULL,
                declined_at = NULL,
                blocked_at = NULL,
                disconnected_at = NULL,
                blocked_by_user_id = NULL
            WHERE c.id = v_row.id
            RETURNING * INTO v_row;
            PERFORM public.connections_write_audit('requested', v_row.id, p_recipient_user_id);
            RETURN QUERY
            SELECT
                v_row.id,
                v_row.status,
                public.connections_effective_status(v_row.status, v_row.created_at),
                v_row.initiator_user_id,
                v_row.recipient_user_id;
            RETURN;
        END IF;

        IF v_row.status = 'disconnected' THEN
            UPDATE public.bs_connections c
            SET
                initiator_user_id = v_uid,
                recipient_user_id = p_recipient_user_id,
                status = 'pending',
                created_at = now(),
                accepted_at = NULL,
                declined_at = NULL,
                blocked_at = NULL,
                disconnected_at = NULL,
                blocked_by_user_id = NULL
            WHERE c.id = v_row.id
            RETURNING * INTO v_row;
            PERFORM public.connections_write_audit('requested', v_row.id, p_recipient_user_id);
            RETURN QUERY
            SELECT
                v_row.id,
                v_row.status,
                public.connections_effective_status(v_row.status, v_row.created_at),
                v_row.initiator_user_id,
                v_row.recipient_user_id;
            RETURN;
        END IF;
    END IF;

    INSERT INTO public.bs_connections (
        initiator_user_id,
        recipient_user_id,
        status,
        created_at
    )
    VALUES (v_uid, p_recipient_user_id, 'pending', now())
    ON CONFLICT (user_low, user_high) DO UPDATE
    SET
        initiator_user_id = EXCLUDED.initiator_user_id,
        recipient_user_id = EXCLUDED.recipient_user_id,
        status = CASE
            WHEN public.bs_connections.status IN ('blocked', 'accepted', 'declined')
                THEN public.bs_connections.status
            WHEN public.bs_connections.status = 'pending'
                 AND public.bs_connections.recipient_user_id = EXCLUDED.initiator_user_id
                THEN 'accepted'
            ELSE EXCLUDED.status
        END,
        created_at = EXCLUDED.created_at,
        accepted_at = CASE
            WHEN public.bs_connections.status IN ('blocked', 'accepted', 'declined')
                THEN public.bs_connections.accepted_at
            WHEN public.bs_connections.status = 'pending'
                 AND public.bs_connections.recipient_user_id = EXCLUDED.initiator_user_id
                THEN now()
            ELSE public.bs_connections.accepted_at
        END,
        declined_at = CASE
            WHEN public.bs_connections.status IN ('blocked', 'accepted', 'declined')
                THEN public.bs_connections.declined_at
            ELSE NULL
        END,
        blocked_at = CASE
            WHEN public.bs_connections.status = 'blocked'
                THEN public.bs_connections.blocked_at
            ELSE NULL
        END,
        disconnected_at = CASE
            WHEN public.bs_connections.status IN ('blocked', 'accepted', 'declined')
                THEN public.bs_connections.disconnected_at
            ELSE NULL
        END,
        blocked_by_user_id = CASE
            WHEN public.bs_connections.status = 'blocked'
                THEN public.bs_connections.blocked_by_user_id
            ELSE NULL
        END
    WHERE public.bs_connections.status NOT IN ('blocked', 'accepted', 'declined')
       OR (
            public.bs_connections.status = 'pending'
            AND public.bs_connections.recipient_user_id = EXCLUDED.initiator_user_id
       )
    RETURNING * INTO v_row;

    PERFORM public.connections_write_audit(
        CASE WHEN v_row.status = 'accepted' THEN 'accepted' ELSE 'requested' END,
        v_row.id,
        p_recipient_user_id,
        CASE
            WHEN v_row.status = 'accepted' THEN '{"auto_accept":true}'::jsonb
            ELSE '{}'::jsonb
        END
    );

    RETURN QUERY
    SELECT
        v_row.id,
        v_row.status,
        public.connections_effective_status(v_row.status, v_row.created_at),
        v_row.initiator_user_id,
        v_row.recipient_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- connections_search_users — searchable | username_only | hidden
-- ---------------------------------------------------------------------------

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
      AND COALESCE(p.connection_discoverability, 'searchable') <> 'hidden'
      AND (
          (
              COALESCE(p.connection_discoverability, 'searchable') = 'searchable'
              AND (
                  p.username ILIKE v_q || '%' ESCAPE '\'
                  OR p.display_name ILIKE '%' || v_q || '%' ESCAPE '\'
                  OR p.username % v_raw
                  OR p.display_name % v_raw
              )
          )
          OR (
              COALESCE(p.connection_discoverability, 'searchable') = 'username_only'
              AND lower(p.username) = v_exact
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
