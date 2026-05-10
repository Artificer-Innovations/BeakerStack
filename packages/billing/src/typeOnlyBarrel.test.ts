import { describe, expect, it } from 'vitest';

const typeOnlyModules = [
  './types.js',
  './components/FeatureGate.types.js',
  './components/CustomerPortalLink.types.js',
  './components/UsageIndicator.types.js',
  './components/PricingTable.types.js',
  './components/SubscriptionStatus.types.js',
  './components/UpgradePrompt.types.js',
];

describe('component type-only modules', () => {
  it.each(typeOnlyModules)('import %s', async path => {
    await expect(import(path)).resolves.toBeDefined();
  });
});
