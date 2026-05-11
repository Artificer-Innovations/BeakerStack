-- Allow anonymous (unauthenticated) users to read public billing plans.
-- The existing policy restricts SELECT to the authenticated role; this adds
-- a parallel policy for the anon role so the landing-page pricing table can
-- load plan data without requiring a session.
CREATE POLICY "billing_plans_select_anon_public"
    ON public.billing_plans FOR SELECT TO anon USING (is_public = true);
