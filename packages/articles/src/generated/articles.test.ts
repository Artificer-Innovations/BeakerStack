import { describe, expect, it } from 'vitest';
import { ARTICLES } from './articles.js';

describe('generated ARTICLES manifest', () => {
  it('loads demo articles from the repo build', () => {
    expect(ARTICLES.siteOrigin).toBe('https://beakerstack.com');
    expect(ARTICLES.articles.length).toBeGreaterThanOrEqual(2);
    expect(ARTICLES.articles[0]?.html).toContain('<');
  });
});
