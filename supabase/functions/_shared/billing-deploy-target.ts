/**
 * Stable per-deployment label for Stripe Checkout metadata and webhook filtering.
 * Hosted Supabase: project ref from `*.supabase.co` hostname. Local Docker / 127.0.0.1: `local`.
 * Override with `BILLING_WEBHOOK_TARGET` when the URL is not a standard supabase.co host.
 */
export function getBillingDeployTarget(): string {
  const override = Deno.env.get('BILLING_WEBHOOK_TARGET')?.trim();
  if (override) return override;

  const raw =
    Deno.env.get('SUPABASE_URL') ?? Deno.env.get('BILLING_SUPABASE_URL') ?? '';
  if (!raw) return 'local';

  try {
    const host = new URL(raw).hostname;
    const m = /^([^.]+)\.supabase\.co$/i.exec(host);
    if (m) return m[1];
  } catch {
    // invalid URL — fall through to local
  }
  return 'local';
}
