-- Delete a billing demo collection row (same guards as add/add_item).

CREATE OR REPLACE FUNCTION public.billing_demo_delete_collection(
    p_product_id text,
    p_collection_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
BEGIN
    IF NOT public.billing_demo_mode_enabled() THEN
        RAISE EXCEPTION 'demo billing disabled';
    END IF;
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    DELETE FROM public.billing_demo_collections c
    WHERE c.id = p_collection_id
      AND c.user_id = v_uid
      AND c.product_id = p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_demo_delete_collection(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_demo_delete_collection(text, uuid) TO authenticated;
