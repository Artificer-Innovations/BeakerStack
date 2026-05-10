-- Billing demo persistence for collections/items counters (template-only).
-- Keeps the demo "numeric caps" surface persistent across reloads.

CREATE TABLE IF NOT EXISTS public.billing_demo_collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES public.billing_products (id) ON DELETE CASCADE,
    item_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_demo_collections_lookup
    ON public.billing_demo_collections (user_id, product_id, created_at);

CREATE TRIGGER billing_demo_collections_updated_at
    BEFORE UPDATE ON public.billing_demo_collections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.billing_demo_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_demo_collections_select_own"
    ON public.billing_demo_collections FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Mutations happen through SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.billing_demo_get_collections(p_product_id text)
RETURNS TABLE (id uuid, item_count integer)
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

    RETURN QUERY
    SELECT c.id, c.item_count
    FROM public.billing_demo_collections c
    WHERE c.user_id = v_uid
      AND c.product_id = p_product_id
    ORDER BY c.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_demo_get_collections(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_demo_get_collections(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.billing_demo_add_collection(p_product_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_id uuid;
BEGIN
    IF NOT public.billing_demo_mode_enabled() THEN
        RAISE EXCEPTION 'demo billing disabled';
    END IF;
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    INSERT INTO public.billing_demo_collections (user_id, product_id, item_count)
    VALUES (v_uid, p_product_id, 0)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_demo_add_collection(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_demo_add_collection(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.billing_demo_add_item(p_product_id text, p_collection_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_count integer;
BEGIN
    IF NOT public.billing_demo_mode_enabled() THEN
        RAISE EXCEPTION 'demo billing disabled';
    END IF;
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    UPDATE public.billing_demo_collections c
    SET item_count = c.item_count + 1,
        updated_at = now()
    WHERE c.id = p_collection_id
      AND c.user_id = v_uid
      AND c.product_id = p_product_id
    RETURNING c.item_count INTO v_count;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'collection not found';
    END IF;

    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_demo_add_item(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_demo_add_item(text, uuid) TO authenticated;
