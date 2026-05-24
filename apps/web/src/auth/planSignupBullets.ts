import { billingConfig } from '@adopter/config/billing';

/** Up to 3 human-readable lines for signup plan context (from template billing config). */
export function planSignupBullets(planId: string): string[] {
  const cfg = billingConfig.plans.find(p => p.id === planId);
  if (!cfg) return [];

  const out: string[] = [];
  if (cfg.trialPeriodDays > 0) {
    out.push(
      `Includes a ${cfg.trialPeriodDays}-day trial, then billed at this rate.`
    );
  }

  const feats = cfg.features as Record<string, number | boolean | undefined>;
  for (const row of billingConfig.planFeatureRows) {
    if (out.length >= 3) break;
    const val = feats[row.featureKey];
    if (row.kind === 'boolean') {
      if (val === true) out.push(row.label);
    } else {
      if (typeof val !== 'number') continue;
      if (val === -1) out.push(row.unlimitedLabel);
      else out.push(row.limitedLabelTemplate.replace('{count}', String(val)));
    }
  }

  const ai = cfg.usageLimits?.ai_summarize;
  if (out.length < 3 && typeof ai === 'number') {
    const label = billingConfig.usageMeterCopy.ai_summarize?.label;
    if (ai === -1) {
      out.push(label ? `Unlimited ${label}` : 'Unlimited AI summarize');
    } else {
      out.push(
        label
          ? `${ai} ${label} / billing period`
          : `${ai} AI summarize requests / billing period`
      );
    }
  }

  return out;
}
