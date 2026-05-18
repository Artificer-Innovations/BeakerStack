-- Repair for databases that applied waitlist v1 before PR #274 validation fixes.
-- Ensures invalid settings input returns structured JSON errors before table CHECKs fire.

CREATE OR REPLACE FUNCTION public.admin_update_waitlist_settings(
    p_signup_mode text DEFAULT NULL,
    p_default_plan_id text DEFAULT NULL,
    p_invite_ttl_days integer DEFAULT NULL,
    p_identity_match_mode text DEFAULT NULL,
    p_copy jsonb DEFAULT NULL,
    p_metadata_schema jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF p_signup_mode IS NOT NULL
       AND p_signup_mode NOT IN ('open', 'waitlist', 'invite_only', 'closed') THEN
        RETURN jsonb_build_object('error', 'invalid_signup_mode');
    END IF;

    IF p_identity_match_mode IS NOT NULL
       AND p_identity_match_mode NOT IN ('lenient', 'strict') THEN
        RETURN jsonb_build_object('error', 'invalid_identity_match_mode');
    END IF;

    IF p_invite_ttl_days IS NOT NULL AND p_invite_ttl_days < 1 THEN
        RETURN jsonb_build_object('error', 'invalid_invite_ttl_days');
    END IF;

    UPDATE public.waitlist_settings
    SET
        signup_mode = COALESCE(p_signup_mode, signup_mode),
        default_plan_id = COALESCE(p_default_plan_id, default_plan_id),
        invite_ttl_days = COALESCE(p_invite_ttl_days, invite_ttl_days),
        identity_match_mode = COALESCE(p_identity_match_mode, identity_match_mode),
        copy = COALESCE(p_copy, copy),
        metadata_schema = COALESCE(p_metadata_schema, metadata_schema),
        updated_at = now(),
        updated_by = v_uid
    WHERE id = 1;

    PERFORM public._admin_insert_audit(
        v_uid,
        'waitlist.settings.update',
        'waitlist_settings',
        '1',
        jsonb_build_object(
            'signup_mode', p_signup_mode,
            'default_plan_id', p_default_plan_id,
            'invite_ttl_days', p_invite_ttl_days,
            'identity_match_mode', p_identity_match_mode,
            'copy', p_copy,
            'metadata_schema', p_metadata_schema
        )
    );

    RETURN public.admin_get_waitlist_settings();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_waitlist_settings(text, text, integer, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_waitlist_settings(text, text, integer, text, jsonb, jsonb) TO authenticated;
