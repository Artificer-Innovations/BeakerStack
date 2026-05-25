import { describe, expect, it } from 'vitest';
import { adminProductId, getAdminUsageMeterKeys } from '../adminUsageColumns';

describe('adminUsageColumns', () => {
  it('exports product id from billing config', () => {
    expect(adminProductId).toBe('beakerstack');
  });

  it('collects usage meter keys from all plans', () => {
    const keys = getAdminUsageMeterKeys();
    expect(keys).toContain('ai_summarize');
    expect(keys.length).toBeGreaterThan(0);
  });
});
