import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

function mockConfig(overrides: {
  usageMeterCopy: Record<string, { label?: string }>;
  plans: Array<{
    id: string;
    trialPeriodDays: number;
    features: Record<string, unknown>;
    usageLimits?: { ai_summarize?: number };
  }>;
}) {
  vi.doMock('@adopter/config/billing', () => ({
    billingConfig: {
      plans: overrides.plans,
      planFeatureRows: [],
      usageMeterCopy: overrides.usageMeterCopy,
    },
  }));
}

describe('planSignupBullets (AI meter label branches)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@adopter/config/billing');
    vi.resetModules();
  });

  it('uses meter label for unlimited AI when configured', async () => {
    mockConfig({
      usageMeterCopy: { ai_summarize: { label: 'Summaries' } },
      plans: [
        {
          id: 'meter_label',
          trialPeriodDays: 0,
          features: {},
          usageLimits: { ai_summarize: -1 },
        },
      ],
    });
    const { planSignupBullets } = await import('../planSignupBullets');
    expect(planSignupBullets('meter_label')).toContain('Unlimited Summaries');
  });

  it('falls back for unlimited AI when meter label is absent', async () => {
    mockConfig({
      usageMeterCopy: {},
      plans: [
        {
          id: 'meter_ul',
          trialPeriodDays: 0,
          features: {},
          usageLimits: { ai_summarize: -1 },
        },
      ],
    });
    const { planSignupBullets } = await import('../planSignupBullets');
    expect(planSignupBullets('meter_ul')).toContain('Unlimited AI summarize');
  });

  it('formats finite AI usage without a meter label', async () => {
    mockConfig({
      usageMeterCopy: {},
      plans: [
        {
          id: 'meter_fin',
          trialPeriodDays: 0,
          features: {},
          usageLimits: { ai_summarize: 12 },
        },
      ],
    });
    const { planSignupBullets } = await import('../planSignupBullets');
    expect(planSignupBullets('meter_fin')).toContain(
      '12 AI summarize requests / billing period'
    );
  });

  it('formats finite AI usage with a meter label', async () => {
    mockConfig({
      usageMeterCopy: { ai_summarize: { label: 'Summaries' } },
      plans: [
        {
          id: 'meter_finite',
          trialPeriodDays: 0,
          features: {},
          usageLimits: { ai_summarize: 7 },
        },
      ],
    });
    const { planSignupBullets } = await import('../planSignupBullets');
    expect(planSignupBullets('meter_finite')).toContain(
      '7 Summaries / billing period'
    );
  });
});
