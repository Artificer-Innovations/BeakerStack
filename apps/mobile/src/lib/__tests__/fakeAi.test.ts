import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('nextFakeAiSummary', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns snippets in rotation and wraps after three calls', () => {
    const { nextFakeAiSummary } = require('../fakeAi') as {
      nextFakeAiSummary: () => string;
    };

    const first = nextFakeAiSummary();
    const second = nextFakeAiSummary();
    const third = nextFakeAiSummary();
    const fourth = nextFakeAiSummary();

    expect(first.startsWith('Lorem ipsum')).toBe(true);
    expect(second.startsWith('Maecenas ligula')).toBe(true);
    expect(third.startsWith('Duis semper')).toBe(true);
    expect(fourth).toBe(first);
  });

  it('starts from the beginning after module reset', () => {
    const { nextFakeAiSummary: a } = require('../fakeAi') as {
      nextFakeAiSummary: () => string;
    };
    const one = a();

    jest.resetModules();
    const { nextFakeAiSummary: b } = require('../fakeAi') as {
      nextFakeAiSummary: () => string;
    };
    const afterReset = b();

    expect(one.startsWith('Lorem ipsum')).toBe(true);
    expect(afterReset.startsWith('Lorem ipsum')).toBe(true);
  });
});
