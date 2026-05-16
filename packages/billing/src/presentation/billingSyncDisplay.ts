import type { Plan } from '../types.js';
import billingSync from './billing-sync.json';

type SyncPrice = {
  unitAmount?: number;
  interval?: string;
};

type SyncPlan = {
  planId?: string;
  prices?: SyncPrice[];
};

function syncRow(planId: string): SyncPlan | undefined {
  const plans = billingSync.plans as SyncPlan[] | undefined;
  return plans?.find(p => p.planId === planId);
}

/**
 * Monthly list price in cents from `billing-sync.json` (`interval: "month"`),
 * else `fallbackCents` (typically `billing_plans.price_cents`).
 */
export function monthlyListCentsFromSync(
  planId: string,
  fallbackCents: number
): number {
  const month = syncRow(planId)?.prices?.find(p => p.interval === 'month');
  if (month != null && typeof month.unitAmount === 'number') {
    return month.unitAmount;
  }
  return fallbackCents;
}

/**
 * Annual list price in cents from `billing-sync.json` (same source as
 * `npm run billing:sync-stripe` → Stripe yearly `unit_amount`).
 * If no yearly row exists, falls back to 12× resolved monthly cents.
 */
export function annualListCentsFromSync(
  planId: string,
  monthlyCentsFallback: number
): number {
  const monthly = monthlyListCentsFromSync(planId, monthlyCentsFallback);
  const year = syncRow(planId)?.prices?.find(p => p.interval === 'year');
  if (year != null && typeof year.unitAmount === 'number') {
    return year.unitAmount;
  }
  return monthly * 12;
}

export type PlanSavingsCopy =
  | { kind: 'none' }
  | { kind: 'months'; months: number }
  | { kind: 'percent'; pct: number };

/** Savings is “N whole months free” if (12×M − annual) / M is within this of an integer. */
const MONTH_FREE_TOLERANCE = 0.051;

/**
 * Per paid plan: prefer “N months free” when discount aligns with whole months
 * of the monthly list price; otherwise rounded percent vs 12× monthly.
 */
export function planAnnualSavingsCopy(
  planId: string,
  dbMonthlyCents: number
): PlanSavingsCopy {
  const monthly = monthlyListCentsFromSync(planId, dbMonthlyCents);
  const annual = annualListCentsFromSync(planId, dbMonthlyCents);
  const yearAtMonthlyRates = monthly * 12;
  if (yearAtMonthlyRates <= 0 || annual <= 0 || annual >= yearAtMonthlyRates) {
    return { kind: 'none' };
  }
  const savingsCents = yearAtMonthlyRates - annual;
  const monthsFloat = savingsCents / monthly;
  const monthsRounded = Math.round(monthsFloat);
  if (
    monthsRounded >= 1 &&
    Math.abs(monthsFloat - monthsRounded) <= MONTH_FREE_TOLERANCE
  ) {
    return { kind: 'months', months: monthsRounded };
  }
  const pct = Math.round((savingsCents / yearAtMonthlyRates) * 100);
  if (pct <= 0) return { kind: 'none' };
  return { kind: 'percent', pct };
}

/**
 * Rounded percent saved vs paying monthly price × 12 (null if not cheaper).
 */
export function annualSavingsPercentForPlan(
  planId: string,
  dbMonthlyCents: number
): number | null {
  const monthly = monthlyListCentsFromSync(planId, dbMonthlyCents);
  const annual = annualListCentsFromSync(planId, dbMonthlyCents);
  const yearAtMonthlyRates = monthly * 12;
  if (yearAtMonthlyRates <= 0 || annual <= 0) return null;
  if (annual >= yearAtMonthlyRates) return null;
  return Math.round(((yearAtMonthlyRates - annual) / yearAtMonthlyRates) * 100);
}

export type CadenceSavingsLabel =
  | { kind: 'none' }
  | { kind: 'months'; months: number }
  | { kind: 'months_range'; max: number }
  | { kind: 'percent'; pct: number }
  | { kind: 'percent_range'; max: number };

function formatMonthsFreeTitleCase(n: number): string {
  return n === 1 ? '1 Month Free' : `${n} Months Free`;
}

/** Badge / callout next to a plan name (annual view). */
export function formatSavingsCalloutFromCopy(
  copy: PlanSavingsCopy
): string | null {
  if (copy.kind === 'none') return null;
  if (copy.kind === 'months') return formatMonthsFreeTitleCase(copy.months);
  return `Save ${copy.pct}%`;
}

/**
 * Short savings text for the nested pill inside “Annually” (no “Annually · ” prefix).
 */
export function formatCadenceToggleSavingsBadge(
  s: CadenceSavingsLabel
): string | null {
  if (s.kind === 'none') return null;
  if (s.kind === 'months') return formatMonthsFreeTitleCase(s.months);
  if (s.kind === 'months_range') return `Up to ${s.max} Months Free`;
  if (s.kind === 'percent') return `Save ${s.pct}%`;
  return `Save up to ${s.max}%`;
}

/**
 * Aggregate savings copy for the cadence toggle across paid catalog plans.
 */
export function cadenceAnnualSavingsFromPlans(
  plans: Plan[]
): CadenceSavingsLabel {
  const paid = plans.filter(p => p.price_cents > 0);
  const copies = paid.map(p => planAnnualSavingsCopy(p.id, p.price_cents));
  const valid = copies.filter(
    (c): c is Exclude<PlanSavingsCopy, { kind: 'none' }> => {
      return c.kind !== 'none';
    }
  );
  if (valid.length === 0) return { kind: 'none' };

  const monthCopies = valid.filter(
    (c): c is { kind: 'months'; months: number } => c.kind === 'months'
  );
  const pctCopies = valid.filter(
    (c): c is { kind: 'percent'; pct: number } => c.kind === 'percent'
  );

  if (monthCopies.length === valid.length) {
    const ns = monthCopies.map(m => m.months);
    const min = Math.min(...ns);
    const max = Math.max(...ns);
    if (min === max) return { kind: 'months', months: min };
    return { kind: 'months_range', max };
  }

  if (pctCopies.length === valid.length) {
    const ps = pctCopies.map(p => p.pct);
    const min = Math.min(...ps);
    const max = Math.max(...ps);
    if (min === max) return { kind: 'percent', pct: min };
    if (max - min <= 1)
      return { kind: 'percent', pct: Math.round((min + max) / 2) };
    return { kind: 'percent_range', max };
  }

  const pcts = paid
    .map(p => annualSavingsPercentForPlan(p.id, p.price_cents))
    .filter((x): x is number => x != null && x > 0);
  if (pcts.length === 0) return { kind: 'none' };
  const min = Math.min(...pcts);
  const max = Math.max(...pcts);
  if (min === max) return { kind: 'percent', pct: min };
  if (max - min <= 1)
    return { kind: 'percent', pct: Math.round((min + max) / 2) };
  return { kind: 'percent_range', max };
}

/** Full single-line label (e.g. tooltips); prefer split pill + `formatCadenceToggleSavingsBadge` in UI. */
export function formatCadenceAnnualButtonLabel(s: CadenceSavingsLabel): string {
  const b = formatCadenceToggleSavingsBadge(s);
  return b ? `Annually · ${b}` : 'Annually';
}
