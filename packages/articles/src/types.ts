export interface ArticleRecord {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  tags: string[];
  keywords?: string[];
  snapshotDate?: string;
  readingTimeMinutes: number;
  excerpt: string;
  html: string;
  relatedSlugs: string[];
}

export interface ArticlesManifest {
  siteOrigin: string;
  publisherName: string;
  defaultOgImage: string;
  articles: ArticleRecord[];
  /** Tag slug (kebab) → article slugs, newest first within tag. */
  tagIndex: Record<string, string[]>;
}
