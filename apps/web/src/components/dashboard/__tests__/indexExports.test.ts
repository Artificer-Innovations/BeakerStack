import { describe, expect, it } from 'vitest';
import {
  AISummarizeResult,
  BooleanGatesDemo,
  DashboardDemoSection,
  DemoControlsPanel,
  MeteredUsageDemo,
  NumericCapsDemo,
} from '../index';

describe('dashboard index exports', () => {
  it('re-exports demo components', () => {
    expect(typeof AISummarizeResult).toBe('function');
    expect(typeof BooleanGatesDemo).toBe('function');
    expect(typeof DashboardDemoSection).toBe('function');
    expect(typeof DemoControlsPanel).toBe('function');
    expect(typeof MeteredUsageDemo).toBe('function');
    expect(typeof NumericCapsDemo).toBe('function');
  });
});
