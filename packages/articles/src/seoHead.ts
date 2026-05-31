import type { ArticleRecord, ArticlesManifest } from './types.js';

export interface ArticlesSeoConfig {
  siteOrigin: string;
  publisherName: string;
  defaultOgImage: string;
  productName: string;
}

export interface ArticleSeoFields {
  pageTitle: string;
  ogTitle: string;
  description: string;
  url: string;
  image: string;
  ogType: 'article' | 'website';
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  jsonLd?: Record<string, unknown>;
}

export interface PrerenderHeadPayload {
  pageTitle: string;
  description: string;
  injectBeforeHeadClose: string;
}

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function serializeJsonLd(payload: Record<string, unknown>): string {
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

function buildPublicUrl(siteOrigin: string, path: string): string {
  return `${siteOrigin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

function metaTag(name: string, content: string, property = false): string {
  const attr = property ? 'property' : 'name';
  return `  <meta ${attr}="${escapeHtmlAttr(name)}" content="${escapeHtmlAttr(content)}" />`;
}

function jsonLdScript(id: string, payload: Record<string, unknown>): string {
  return `  <script type="application/ld+json" data-article-jsonld="${escapeHtmlAttr(id)}">${serializeJsonLd(payload)}</script>`;
}

function renderHeadInjection(
  fields: ArticleSeoFields,
  jsonLdId?: string
): string {
  const tags = [
    `  <link rel="canonical" href="${escapeHtmlAttr(fields.url)}" />`,
    metaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1'),
    metaTag('og:title', fields.ogTitle, true),
    metaTag('og:description', fields.description, true),
    metaTag('og:type', fields.ogType, true),
    metaTag('og:url', fields.url, true),
    metaTag('og:image', fields.image, true),
    ...(fields.publishedTime
      ? [metaTag('article:published_time', fields.publishedTime, true)]
      : []),
    ...(fields.modifiedTime
      ? [metaTag('article:modified_time', fields.modifiedTime, true)]
      : []),
    ...(fields.tags ?? []).map(tag => metaTag('article:tag', tag, true)),
    metaTag('twitter:card', 'summary_large_image'),
    metaTag('twitter:title', fields.ogTitle),
    metaTag('twitter:description', fields.description),
    metaTag('twitter:image', fields.image),
  ];

  if (fields.jsonLd && jsonLdId) {
    tags.push(jsonLdScript(jsonLdId, fields.jsonLd));
  }

  return tags.join('\n');
}

export function buildArticleSeoFields(
  article: ArticleRecord,
  manifest: Pick<
    ArticlesManifest,
    'siteOrigin' | 'publisherName' | 'defaultOgImage'
  >,
  config: ArticlesSeoConfig
): ArticleSeoFields {
  const url = buildPublicUrl(manifest.siteOrigin, `/articles/${article.slug}`);
  const image = buildPublicUrl(manifest.siteOrigin, manifest.defaultOgImage);

  return {
    pageTitle: `${article.title} | ${config.productName}`,
    ogTitle: article.title,
    description: article.description,
    url,
    image,
    ogType: 'article',
    publishedTime: article.date,
    ...(article.updated ? { modifiedTime: article.updated } : {}),
    tags: article.tags,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.description,
      datePublished: article.date,
      dateModified: article.updated ?? article.date,
      author: {
        '@type': 'Organization',
        name: manifest.publisherName,
      },
      publisher: {
        '@type': 'Organization',
        name: manifest.publisherName,
      },
      image,
      mainEntityOfPage: url,
    },
  };
}

export function buildArticlesIndexSeoFields(
  manifest: Pick<
    ArticlesManifest,
    'siteOrigin' | 'publisherName' | 'defaultOgImage'
  >,
  config: ArticlesSeoConfig,
  description = 'Articles on AI memory, MCP, OAuth connection, and honest product comparisons.'
): ArticleSeoFields {
  return {
    pageTitle: `Articles | ${config.productName}`,
    ogTitle: `Articles | ${config.productName}`,
    description,
    url: buildPublicUrl(manifest.siteOrigin, '/articles'),
    image: buildPublicUrl(manifest.siteOrigin, manifest.defaultOgImage),
    ogType: 'website',
  };
}

export function buildTagSeoFields(
  tagLabel: string,
  manifest: Pick<
    ArticlesManifest,
    'siteOrigin' | 'publisherName' | 'defaultOgImage'
  >,
  config: ArticlesSeoConfig,
  tagSlug: string
): ArticleSeoFields {
  return {
    pageTitle: `${tagLabel} | Articles | ${config.productName}`,
    ogTitle: `${tagLabel} | Articles | ${config.productName}`,
    description: `Articles tagged “${tagLabel}” on ${config.productName}.`,
    url: buildPublicUrl(manifest.siteOrigin, `/articles/tags/${tagSlug}`),
    image: buildPublicUrl(manifest.siteOrigin, manifest.defaultOgImage),
    ogType: 'website',
  };
}

export function buildArticlePrerenderHead(
  article: ArticleRecord,
  manifest: Pick<
    ArticlesManifest,
    'siteOrigin' | 'publisherName' | 'defaultOgImage'
  >,
  config: ArticlesSeoConfig
): PrerenderHeadPayload {
  const fields = buildArticleSeoFields(article, manifest, config);
  return {
    pageTitle: fields.pageTitle,
    description: fields.description,
    injectBeforeHeadClose: renderHeadInjection(fields, article.slug),
  };
}

export function buildArticlesIndexPrerenderHead(
  manifest: Pick<
    ArticlesManifest,
    'siteOrigin' | 'publisherName' | 'defaultOgImage'
  >,
  config: ArticlesSeoConfig,
  description?: string
): PrerenderHeadPayload {
  const fields = buildArticlesIndexSeoFields(manifest, config, description);
  return {
    pageTitle: fields.pageTitle,
    description: fields.description,
    injectBeforeHeadClose: renderHeadInjection(fields),
  };
}

export function buildTagPrerenderHead(
  tagLabel: string,
  manifest: Pick<
    ArticlesManifest,
    'siteOrigin' | 'publisherName' | 'defaultOgImage'
  >,
  config: ArticlesSeoConfig,
  tagSlug: string
): PrerenderHeadPayload {
  const fields = buildTagSeoFields(tagLabel, manifest, config, tagSlug);
  return {
    pageTitle: fields.pageTitle,
    description: fields.description,
    injectBeforeHeadClose: renderHeadInjection(fields),
  };
}

export function applyPrerenderDocument(
  template: string,
  payload: PrerenderHeadPayload,
  bodyHtml: string
): string {
  const description = escapeHtmlAttr(payload.description);
  const pageTitle = escapeHtmlAttr(payload.pageTitle);

  let html = template.replace(
    /<title>[\s\S]*?<\/title>/,
    () => `<title>${pageTitle}</title>`
  );
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/>/,
    () => `<meta name="description" content="${description}" />`
  );
  // Site-wide OG/Twitter tags in index.html are superseded by the full injection set.
  html = html.replace(/\n\s*<meta property="og:[^"]+"[^>]*\/>/g, '');
  html = html.replace(/\n\s*<meta name="twitter:[^"]+"[^>]*\/>/g, '');
  html = html.replace(
    '</head>',
    () => `${payload.injectBeforeHeadClose}\n  </head>`
  );
  html = html.replace(
    '<div id="root"></div>',
    () => `<div id="root">${bodyHtml}</div>`
  );
  return html;
}
