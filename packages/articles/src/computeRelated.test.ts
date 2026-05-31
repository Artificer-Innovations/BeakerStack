import { describe, expect, it } from 'vitest';
import {
  buildTagIndex,
  computeRelatedSlugs,
  sortSlugsByArticleDate,
} from './computeRelated.js';

describe('computeRelatedSlugs', () => {
  const articles = [
    { slug: 'a', date: '2026-05-30', tags: ['glossary', 'mcp'] },
    { slug: 'b', date: '2026-05-28', tags: ['glossary'] },
    { slug: 'c', date: '2026-05-29', tags: ['comparison'] },
  ];
  const [articleA, articleB, articleC] = articles;
  if (!articleA || !articleB || !articleC) {
    throw new Error('fixture articles missing');
  }

  it('returns related slugs ordered by shared tags then date', () => {
    expect(computeRelatedSlugs(articleA, articles)).toEqual(['b']);
  });

  it('excludes the current article and articles without shared tags', () => {
    expect(computeRelatedSlugs(articleC, articles)).toEqual([]);
  });

  it('respects the limit argument', () => {
    const many = [
      { slug: 'x', date: '2026-05-30', tags: ['tag'] },
      { slug: 'y', date: '2026-05-29', tags: ['tag'] },
      { slug: 'z', date: '2026-05-28', tags: ['tag'] },
      { slug: 'w', date: '2026-05-27', tags: ['tag'] },
    ];
    const [firstArticle] = many;
    if (!firstArticle) {
      throw new Error('fixture articles missing');
    }
    expect(computeRelatedSlugs(firstArticle, many, 2)).toHaveLength(2);
  });
});

describe('buildTagIndex', () => {
  it('indexes tags and sorts slugs newest first', () => {
    const index = buildTagIndex([
      { slug: 'older', date: '2026-05-01', tags: ['Alpha'] },
      { slug: 'newer', date: '2026-05-30', tags: ['alpha'] },
    ]);
    expect(index.alpha).toEqual(['newer', 'older']);
  });
});

describe('sortSlugsByArticleDate', () => {
  it('leaves order unchanged when a slug is missing from the article list', () => {
    const slugs = ['missing', 'present'];
    sortSlugsByArticleDate(slugs, [{ slug: 'present', date: '2026-05-30' }]);
    expect(slugs).toEqual(['missing', 'present']);
  });
});
