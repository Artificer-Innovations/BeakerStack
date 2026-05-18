import { describe, it, expect, afterEach } from '@jest/globals';
import { getMobileBillingProviderUrls } from '../mobileBillingUrls';

describe('getMobileBillingProviderUrls', () => {
  const ENV_KEY = 'EXPO_PUBLIC_BILLING_DEMO_BASE_URL';
  const original = process.env[ENV_KEY];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = original;
    }
  });

  it('uses deep-link scheme by default (beaker-stack://billing)', () => {
    delete process.env[ENV_KEY];
    const urls = getMobileBillingProviderUrls();
    expect(urls.checkoutSuccessUrl).toBe('beaker-stack://billing?checkout=success');
    expect(urls.checkoutCancelUrl).toBe('beaker-stack://billing?checkout=cancel');
    expect(urls.portalReturnUrl).toBe('beaker-stack://billing');
  });

  it('uses deep-link query params for a custom non-http scheme', () => {
    process.env[ENV_KEY] = 'myapp://billing';
    const urls = getMobileBillingProviderUrls();
    expect(urls.checkoutSuccessUrl).toBe('myapp://billing?checkout=success');
    expect(urls.checkoutCancelUrl).toBe('myapp://billing?checkout=cancel');
    expect(urls.portalReturnUrl).toBe('myapp://billing');
  });

  it('uses path segments for an http base URL', () => {
    process.env[ENV_KEY] = 'http://192.168.1.10:8081';
    const urls = getMobileBillingProviderUrls();
    expect(urls.checkoutSuccessUrl).toBe('http://192.168.1.10:8081/billing?checkout=success');
    expect(urls.checkoutCancelUrl).toBe('http://192.168.1.10:8081/billing/plans?checkout=cancel');
    expect(urls.portalReturnUrl).toBe('http://192.168.1.10:8081/billing');
  });

  it('uses path segments for an https base URL', () => {
    process.env[ENV_KEY] = 'https://staging.example.com';
    const urls = getMobileBillingProviderUrls();
    expect(urls.checkoutSuccessUrl).toBe('https://staging.example.com/billing?checkout=success');
    expect(urls.checkoutCancelUrl).toBe('https://staging.example.com/billing/plans?checkout=cancel');
    expect(urls.portalReturnUrl).toBe('https://staging.example.com/billing');
  });
});
