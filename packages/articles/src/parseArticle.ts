import matter from 'gray-matter';
import { marked } from 'marked';
import {
  articleFrontmatterSchema,
  type ArticleFrontmatter,
} from './articleFrontmatterSchema.js';
import {
  buildExcerpt,
  computeReadingTimeMinutes,
  slugifyFilename,
} from './articleUtils.js';
import { sanitizeArticleHtml } from './sanitizeArticleHtml.js';

marked.setOptions({ gfm: true, breaks: false });

function normalizeFrontmatterValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeFrontmatterValue);
  }
  return value;
}

function normalizeFrontmatterData(
  data: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      normalizeFrontmatterValue(value),
    ])
  );
}

export interface ParsedArticleSource {
  filename: string;
  slug: string;
  frontmatter: ArticleFrontmatter;
  body: string;
}

export interface ParsedArticle extends ParsedArticleSource {
  html: string;
  readingTimeMinutes: number;
  excerpt: string;
}

export function parseArticleSource(
  filename: string,
  raw: string
): ParsedArticleSource {
  const { data, content } = matter(raw);
  const normalized = normalizeFrontmatterData(data);
  const parsed = articleFrontmatterSchema.safeParse(normalized);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`${filename}: invalid frontmatter — ${details}`);
  }

  const slug = parsed.data.slug ?? slugifyFilename(filename);
  return {
    filename,
    slug,
    frontmatter: parsed.data,
    body: content.trim(),
  };
}

export function renderArticleMarkdown(body: string): {
  html: string;
  readingTimeMinutes: number;
  excerpt: string;
} {
  const html = sanitizeArticleHtml(marked.parse(body) as string);
  return {
    html,
    readingTimeMinutes: computeReadingTimeMinutes(body),
    excerpt: buildExcerpt(body),
  };
}

export function parseArticle(filename: string, raw: string): ParsedArticle {
  const source = parseArticleSource(filename, raw);
  const rendered = renderArticleMarkdown(source.body);
  return { ...source, ...rendered };
}
