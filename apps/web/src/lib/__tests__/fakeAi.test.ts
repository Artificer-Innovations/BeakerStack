import { describe, expect, it } from 'vitest';
import { nextFakeAiSummary } from '../fakeAi';

describe('nextFakeAiSummary', () => {
  it('returns non-empty text and rotates through snippets', () => {
    const a = nextFakeAiSummary();
    const b = nextFakeAiSummary();
    expect(a.length).toBeGreaterThan(20);
    expect(b.length).toBeGreaterThan(20);
    expect(a).not.toBe(b);
  });
});
