import { ARTICLES } from './generated/articles.js';
import { slugifyTag } from './articleUtils.js';
import type { ArticleRecord } from './types.js';

export function listArticles(): ArticleRecord[] {
  return ARTICLES.articles;
}

export function getArticleBySlug(slug: string): ArticleRecord | undefined {
  return ARTICLES.articles.find(article => article.slug === slug);
}

export function getArticlesByTag(tagSlug: string): ArticleRecord[] {
  const slugs = ARTICLES.tagIndex[tagSlug] ?? [];
  const bySlug = new Map(
    ARTICLES.articles.map(article => [article.slug, article])
  );
  return slugs
    .map(slug => bySlug.get(slug))
    .filter((article): article is ArticleRecord => article !== undefined);
}

export function getTagLabel(tagSlug: string): string | undefined {
  for (const article of ARTICLES.articles) {
    for (const tag of article.tags) {
      if (slugifyTag(tag) === tagSlug) return tag;
    }
  }
  return undefined;
}

export { slugifyTag };
