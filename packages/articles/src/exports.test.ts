import { describe, expect, it } from 'vitest';
import { ARTICLES_NAV_LINK } from './nav.js';

describe('package exports', () => {
  it('re-exports core helpers from index', async () => {
    const index = await import('./index.js');
    expect(index.listArticles().length).toBeGreaterThan(0);
    expect(index.slugifyTag('OAuth Trust')).toBe('oauth-trust');
    expect(index.ARTICLES_NAV_LINK).toEqual(ARTICLES_NAV_LINK);
  });

  it('re-exports web components', async () => {
    const web = await import('./web.js');
    expect(web.ArticlesIndex).toBeTypeOf('function');
    expect(web.ArticleDetail).toBeTypeOf('function');
    expect(web.TagListing).toBeTypeOf('function');
    expect(web.ArticleHead).toBeTypeOf('function');
    expect(web.getArticleBySlug).toBeTypeOf('function');
  });

  it('exports articles nav link', () => {
    expect(ARTICLES_NAV_LINK).toEqual({ label: 'Articles', href: '/articles' });
  });
});
