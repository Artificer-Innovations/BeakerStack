-- BeakerStack Billing UI v1: split Stripe prices by cadence, store subscription price id, invoice history

-- ---------------------------------------------------------------------------
-- billing_plans: monthly + annual Stripe price ids
-- ---------------------------------------------------------------------------

ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_annual text;

UPDATE public.billing_plans
SET stripe_price_id_monthly = stripe_price_id
WHERE stripe_price_id IS NOT NULL;

ALTER TABLE public.billing_plans
  DROP COLUMN IF EXISTS stripe_price_id;

-- ---------------------------------------------------------------------------
-- billing_subscriptions: which Stripe price the user is on (cadence)
-- ---------------------------------------------------------------------------

ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- ---------------------------------------------------------------------------
-- billing_invoices: Stripe invoice mirror (webhook-only writes)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text,
  amount_due integer NOT NULL,
  amount_paid integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  description text,
  hosted_invoice_url text,
  invoice_pdf_url text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_user_id_created
  ON public.billing_invoices (user_id, created_at DESC);

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_invoices_select_own"
  ON public.billing_invoices FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.billing_invoices IS 'Stripe invoice rows; insert/update only via service role (webhooks).';
