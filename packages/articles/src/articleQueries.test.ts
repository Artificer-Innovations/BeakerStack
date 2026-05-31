import { describe, expect, it, vi } from 'vitest';

const mockArticlesManifest = vi.hoisted(() => ({
  siteOrigin: 'https://beakerstack.com',
  publisherName: 'Beaker Stack',
  defaultOgImage: '/og-image.png',
  articles: [
    {
      slug: 'what-is-mcp',
      title: 'What Is MCP?',
      description:
        'Plain-English explainer of Model Context Protocol for memory.',
      date: '2026-05-28',
      tags: ['glossary', 'mcp'],
      readingTimeMinutes: 4,
      excerpt: 'MCP explainer',
      html: '<p>Body</p>',
      relatedSlugs: [],
    },
  ],
  tagIndex: {
    glossary: ['what-is-mcp'],
    mcp: ['what-is-mcp'],
  },
}));

vi.mock('./generated/articles.js', () => ({
  ARTICLES: mockArticlesManifest,
}));

import {
  getArticleBySlug,
  getArticlesByTag,
  getTagLabel,
  listArticles,
} from './articleQueries.js';

describe('articleQueries', () => {
  it('lists articles from the generated manifest', () => {
    expect(listArticles()).toHaveLength(1);
  });

  it('finds articles by slug', () => {
    expect(getArticleBySlug('what-is-mcp')?.title).toBe('What Is MCP?');
    expect(getArticleBySlug('missing')).toBeUndefined();
  });

  it('returns articles for a tag slug in index order', () => {
    expect(getArticlesByTag('mcp').map(article => article.slug)).toEqual([
      'what-is-mcp',
    ]);
    expect(getArticlesByTag('missing')).toEqual([]);
  });

  it('resolves human-readable tag labels', () => {
    expect(getTagLabel('mcp')).toBe('mcp');
    expect(getTagLabel('missing')).toBeUndefined();
  });
});
