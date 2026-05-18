-- Ensure waitlist settings singleton exists (e.g. DB migrated before seed ran)

INSERT INTO public.waitlist_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_get_waitlist_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.waitlist_settings;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT * INTO v_row FROM public.waitlist_settings WHERE id = 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    RETURN jsonb_build_object(
        'signup_mode', COALESCE(v_row.signup_mode, 'open'),
        'default_plan_id', COALESCE(v_row.default_plan_id, 'beakerstack_free'),
        'invite_ttl_days', COALESCE(v_row.invite_ttl_days, 7),
        'identity_match_mode', COALESCE(v_row.identity_match_mode, 'lenient'),
        'copy', COALESCE(v_row.copy, '{}'::jsonb),
        'metadata_schema', COALESCE(v_row.metadata_schema, '[]'::jsonb),
        'updated_at', v_row.updated_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_waitlist_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_waitlist_settings() TO authenticated;
