import { slugifyTag } from './articleUtils.js';

export interface RelatedInput {
  slug: string;
  date: string;
  tags: string[];
}

export function computeRelatedSlugs(
  article: RelatedInput,
  all: ReadonlyArray<RelatedInput>,
  limit = 3
): string[] {
  const articleTags = new Set(article.tags.map(slugifyTag));
  const scored = all
    .filter(other => other.slug !== article.slug)
    .map(other => {
      const shared = other.tags.filter(tag =>
        articleTags.has(slugifyTag(tag))
      ).length;
      return { slug: other.slug, shared, date: other.date };
    })
    .filter(entry => entry.shared > 0)
    .sort((a, b) => {
      if (b.shared !== a.shared) return b.shared - a.shared;
      return b.date.localeCompare(a.date);
    });

  return scored.slice(0, limit).map(entry => entry.slug);
}

export function sortSlugsByArticleDate(
  slugs: string[],
  articles: ReadonlyArray<{ slug: string; date: string }>
): void {
  const articleDates = new Map(
    articles.map(article => [article.slug, article.date])
  );
  slugs.sort((a, b) => {
    const dateA = articleDates.get(a);
    const dateB = articleDates.get(b);
    if (dateA === undefined || dateB === undefined) {
      return 0;
    }
    return dateB.localeCompare(dateA);
  });
}

export function buildTagIndex(
  articles: ReadonlyArray<{ slug: string; date: string; tags: string[] }>
): Record<string, string[]> {
  const index: Record<string, string[]> = {};

  for (const article of articles) {
    for (const tag of article.tags) {
      const key = slugifyTag(tag);
      if (!index[key]) index[key] = [];
      index[key].push(article.slug);
    }
  }

  for (const slugs of Object.values(index)) {
    sortSlugsByArticleDate(slugs, articles);
  }

  return index;
}
