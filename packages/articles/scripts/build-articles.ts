/* eslint-disable no-console -- build script */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { format, resolveConfig } from 'prettier';
import { buildTagIndex, computeRelatedSlugs } from '../src/computeRelated.js';
import { validateInternalLinks } from '../src/extractInternalLinks.js';
import { parseArticle } from '../src/parseArticle.js';
import type { ArticleRecord, ArticlesManifest } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const PRETTIER_CONFIG_ANCHOR = join(
  REPO_ROOT,
  'packages/articles/package.json'
);
const CONTENT_DIR = join(REPO_ROOT, 'adopter/content/articles');
const OUTPUT_FILE = join(__dirname, '../src/generated/articles.ts');
const SITEMAP_FILE = join(REPO_ROOT, 'apps/web/public/sitemap-articles.xml');

export function discoverArticleFiles(contentDir: string): string[] {
  try {
    return readdirSync(contentDir)
      .filter(name => name.endsWith('.md'))
      .sort();
  } catch {
    return [];
  }
}

export function buildArticlesManifest(
  contentDir: string = CONTENT_DIR,
  siteOrigin = 'https://example.com',
  publisherName = 'Example Publisher',
  defaultOgImage = '/og-image.png'
): ArticlesManifest {
  const files = discoverArticleFiles(contentDir);
  const parsed = files.map(filename => {
    const raw = readFileSync(join(contentDir, filename), 'utf-8');
    return parseArticle(filename, raw);
  });

  const published = parsed.filter(
    article => article.frontmatter.draft !== true
  );

  const slugCounts = new Map<string, number>();
  for (const article of published) {
    slugCounts.set(article.slug, (slugCounts.get(article.slug) ?? 0) + 1);
  }
  const duplicates = [...slugCounts.entries()].filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate article slugs: ${duplicates.map(([slug]) => slug).join(', ')}`
    );
  }

  const linkErrors = validateInternalLinks(
    published.map(article => ({ slug: article.slug, body: article.body }))
  );
  if (linkErrors.length > 0) {
    throw new Error(linkErrors.join('\n'));
  }

  const relatedInputs = published.map(article => ({
    slug: article.slug,
    date: article.frontmatter.date,
    tags: article.frontmatter.tags,
  }));

  const articles: ArticleRecord[] = published
    .map(article => {
      const record: ArticleRecord = {
        slug: article.slug,
        title: article.frontmatter.title,
        description: article.frontmatter.description,
        date: article.frontmatter.date,
        tags: article.frontmatter.tags,
        readingTimeMinutes: article.readingTimeMinutes,
        excerpt: article.excerpt,
        html: article.html,
        relatedSlugs: computeRelatedSlugs(
          {
            slug: article.slug,
            date: article.frontmatter.date,
            tags: article.frontmatter.tags,
          },
          relatedInputs
        ),
      };
      if (article.frontmatter.updated) {
        record.updated = article.frontmatter.updated;
      }
      if (article.frontmatter.keywords) {
        record.keywords = article.frontmatter.keywords;
      }
      if (article.frontmatter.snapshotDate) {
        record.snapshotDate = article.frontmatter.snapshotDate;
      }
      return record;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    siteOrigin: siteOrigin.replace(/\/$/, ''),
    publisherName,
    defaultOgImage,
    articles,
    tagIndex: buildTagIndex(articles),
  };
}

export function renderSitemapXml(manifest: ArticlesManifest): string {
  const escapeXml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const urls = [
    `${manifest.siteOrigin}/articles`,
    ...manifest.articles.map(
      article => `${manifest.siteOrigin}/articles/${article.slug}`
    ),
    ...Object.keys(manifest.tagIndex).map(
      tag => `${manifest.siteOrigin}/articles/tags/${tag}`
    ),
  ];

  const body = urls
    .map(url => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export async function formatGeneratedFile(outputFile: string): Promise<void> {
  const source = readFileSync(outputFile, 'utf-8');
  const config = await resolveConfig(PRETTIER_CONFIG_ANCHOR);
  const formatted = await format(source, {
    ...config,
    filepath: outputFile,
  });
  writeFileSync(outputFile, formatted, 'utf-8');
}

export async function buildArticlesContent(
  contentDir: string = CONTENT_DIR,
  outputFile: string = OUTPUT_FILE,
  sitemapFile: string = SITEMAP_FILE
): Promise<ArticlesManifest> {
  mkdirSync(dirname(outputFile), { recursive: true });
  mkdirSync(dirname(sitemapFile), { recursive: true });

  const legalModule = await import(
    pathToFileURL(join(REPO_ROOT, 'adopter/config/legal.ts')).href
  );
  const brandingModule = await import(
    pathToFileURL(join(REPO_ROOT, 'adopter/config/branding.ts')).href
  );
  const seoModule = await import(
    pathToFileURL(join(REPO_ROOT, 'adopter/config/landing-seo.ts')).href
  );

  const legal = legalModule.legal as { brandUrl: string };
  const branding = brandingModule.branding as { displayName: string };
  const landingSeo = seoModule.landingSeo as { ogImage: string };

  const manifest = buildArticlesManifest(
    contentDir,
    legal.brandUrl,
    branding.displayName,
    landingSeo.ogImage
  );

  const output = `// Generated by packages/articles/scripts/build-articles.ts — do not edit by hand.
// Run \`npm run build:articles -w @beakerstack/articles\` to regenerate.

import type { ArticlesManifest } from '../types.js';

export const ARTICLES: ArticlesManifest = ${JSON.stringify(manifest, null, 2)};
`;

  writeFileSync(outputFile, output, 'utf-8');
  await formatGeneratedFile(outputFile);
  writeFileSync(sitemapFile, renderSitemapXml(manifest), 'utf-8');

  console.log(
    `✓ Generated ${outputFile} (${manifest.articles.length} articles)`
  );
  console.log(`✓ Generated ${sitemapFile}`);

  return manifest;
}

export function shouldRunMain(
  argv1: string | undefined = process.argv[1],
  moduleUrl: string = import.meta.url
): boolean {
  if (!argv1) return false;
  return pathToFileURL(argv1).href === moduleUrl;
}

export async function main(
  contentDir: string = CONTENT_DIR,
  outputFile: string = OUTPUT_FILE,
  sitemapFile: string = SITEMAP_FILE
): Promise<void> {
  await buildArticlesContent(contentDir, outputFile, sitemapFile);
}

export async function runCli(
  runMain: () => Promise<void> = main
): Promise<void> {
  try {
    await runMain();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export function runIfMainModule(
  checkMain: () => boolean = shouldRunMain,
  cli: () => Promise<void> = runCli
): void {
  if (checkMain()) {
    void cli();
  }
}

runIfMainModule();
