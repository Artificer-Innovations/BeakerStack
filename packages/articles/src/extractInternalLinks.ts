const INTERNAL_ARTICLE_LINK =
  /(?:(?:]\(|href=["'])(?:\/articles\/|articles\/))([a-z0-9]+(?:-[a-z0-9]+)*)/gi;

/** Extract article slugs from markdown links like `/articles/foo` or `(/articles/foo)`. */
export function extractInternalArticleLinks(markdown: string): string[] {
  const slugs = new Set<string>();
  for (const match of markdown.matchAll(INTERNAL_ARTICLE_LINK)) {
    const slug = match[1];
    if (slug && slug !== 'tags') {
      slugs.add(slug);
    }
  }
  return [...slugs];
}

export function validateInternalLinks(
  articles: ReadonlyArray<{ slug: string; body: string }>
): string[] {
  const known = new Set(articles.map(article => article.slug));
  const errors: string[] = [];

  for (const article of articles) {
    for (const target of extractInternalArticleLinks(article.body)) {
      if (!known.has(target)) {
        errors.push(
          `${article.slug}: broken internal link to /articles/${target}`
        );
      }
    }
  }

  return errors;
}
