/** Operator-facing metadata key when signup arrives with a pricing-table tier. */
export const PLAN_INTEREST_METADATA_KEY = 'plan_interest';

export const WAITLIST_MODE_COPY_KEYS = [
  'pricing_cta_label',
  'tier_panel_header',
] as const;

export type WaitlistModeCopyKey = (typeof WAITLIST_MODE_COPY_KEYS)[number];

export type WaitlistModeCopy = Record<WaitlistModeCopyKey, string>;

export const DEFAULT_WAITLIST_MODE_COPY: WaitlistModeCopy = {
  pricing_cta_label: 'Join the waitlist for {tier}',
  tier_panel_header: 'JOIN THE WAITLIST FOR',
};

export const WAITLIST_MODE_COPY_FIELD_LABELS: Record<
  WaitlistModeCopyKey,
  string
> = {
  pricing_cta_label:
    'Home pricing CTA label ({tier} = plan display name, e.g. Pro)',
  tier_panel_header: 'Signup tier panel header (waitlist mode)',
};

export function resolveWaitlistModeCopy(
  settingsCopy?: Record<string, Record<string, string>> | undefined,
  configCopy?: Record<string, Record<string, string>> | undefined
): WaitlistModeCopy {
  const waitlist = {
    ...configCopy?.['waitlist'],
    ...settingsCopy?.['waitlist'],
  };

  const resolved: WaitlistModeCopy = { ...DEFAULT_WAITLIST_MODE_COPY };

  for (const key of WAITLIST_MODE_COPY_KEYS) {
    const value = waitlist[key]?.trim();
    if (value) resolved[key] = value;
  }

  return resolved;
}

/** Substitutes `{tier}` in the pricing CTA template (case-insensitive). */
export function formatWaitlistPricingCta(
  template: string,
  tierDisplayName: string
): string {
  return template.replace(/\{tier\}/gi, tierDisplayName);
}
