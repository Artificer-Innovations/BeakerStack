import { describe, it, expect } from 'vitest';
import { wait, testId } from './index';

describe('wait', () => {
  it('resolves after the specified duration', async () => {
    const start = Date.now();
    await wait(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });
});

describe('testId', () => {
  it('generates an ID with the default prefix', () => {
    const id = testId();
    expect(id).toMatch(/^test-[a-z0-9]+$/);
  });

  it('generates an ID with a custom prefix', () => {
    const id = testId('user');
    expect(id).toMatch(/^user-[a-z0-9]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => testId()));
    expect(ids.size).toBe(100);
  });
});
