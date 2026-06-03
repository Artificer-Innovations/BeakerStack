import { useEffect } from 'react';
import { ARTICLES } from '../generated/articles.js';
import {
  buildArticleSeoFields,
  buildArticlesIndexSeoFields,
  buildTagSeoFields,
  serializeJsonLd,
} from '../seoHead.js';
import type { ArticleRecord } from '../types.js';
import { getTagLabel } from '../articleQueries.js';

function upsertMeta(name: string, content: string, property = false): void {
  const selector = property
    ? `meta[property="${name}"]`
    : `meta[name="${name}"]`;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    if (property) {
      element.setAttribute('property', name);
    } else {
      element.setAttribute('name', name);
    }
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function removePropertyMeta(name: string): void {
  removeHeadElements(`meta[property="${name}"]`);
}

function removeHeadElements(selector: string): void {
  document.head.querySelectorAll(selector).forEach(element => element.remove());
}

function setArticleTags(tags: string[] | undefined): void {
  removeHeadElements('meta[property="article:tag"]');
  for (const tag of tags ?? []) {
    const element = document.createElement('meta');
    element.setAttribute('property', 'article:tag');
    element.setAttribute('content', tag);
    document.head.appendChild(element);
  }
}

function upsertCanonical(href: string): void {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function upsertJsonLd(id: string, payload: Record<string, unknown>): void {
  removeHeadElements('script[data-article-jsonld]');
  const element = document.createElement('script');
  element.setAttribute('type', 'application/ld+json');
  element.setAttribute('data-article-jsonld', id);
  element.textContent = serializeJsonLd(payload);
  document.head.appendChild(element);
}

function applySeoFields(
  fields: ReturnType<typeof buildArticleSeoFields>,
  jsonLdId?: string
): void {
  document.title = fields.pageTitle;
  upsertMeta('description', fields.description);
  upsertMeta(
    'robots',
    'index, follow, max-image-preview:large, max-snippet:-1'
  );
  upsertCanonical(fields.url);

  upsertMeta('og:title', fields.ogTitle, true);
  upsertMeta('og:description', fields.description, true);
  upsertMeta('og:type', fields.ogType, true);
  upsertMeta('og:url', fields.url, true);
  upsertMeta('og:image', fields.image, true);
  if (fields.publishedTime) {
    upsertMeta('article:published_time', fields.publishedTime, true);
  } else {
    removePropertyMeta('article:published_time');
  }
  if (fields.modifiedTime) {
    upsertMeta('article:modified_time', fields.modifiedTime, true);
  } else {
    removePropertyMeta('article:modified_time');
  }
  setArticleTags(fields.tags);

  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', fields.ogTitle);
  upsertMeta('twitter:description', fields.description);
  upsertMeta('twitter:image', fields.image);

  if (fields.jsonLd && jsonLdId) {
    upsertJsonLd(jsonLdId, fields.jsonLd);
  } else {
    removeHeadElements('script[data-article-jsonld]');
  }
}

export interface ArticleHeadProps {
  article: ArticleRecord;
  productName: string;
}

export function ArticleHead({ article, productName }: ArticleHeadProps) {
  useEffect(() => {
    const fields = buildArticleSeoFields(article, ARTICLES, {
      ...ARTICLES,
      productName,
    });
    applySeoFields(fields, article.slug);

    return () => {
      document.title = productName;
    };
  }, [article, productName]);

  return null;
}

export interface ArticlesIndexHeadProps {
  productName: string;
  description?: string | undefined;
}

export function ArticlesIndexHead({
  productName,
  description = 'Articles on AI memory, MCP, OAuth connection, and honest product comparisons.',
}: ArticlesIndexHeadProps) {
  useEffect(() => {
    const fields = buildArticlesIndexSeoFields(
      ARTICLES,
      { ...ARTICLES, productName },
      description
    );
    applySeoFields(fields);

    return () => {
      document.title = productName;
    };
  }, [description, productName]);

  return null;
}

export interface TagListingHeadProps {
  tagSlug: string;
  productName: string;
}

export function TagListingHead({ tagSlug, productName }: TagListingHeadProps) {
  useEffect(() => {
    const label = getTagLabel(tagSlug) ?? tagSlug;
    const fields = buildTagSeoFields(
      label,
      ARTICLES,
      { ...ARTICLES, productName },
      tagSlug
    );
    applySeoFields(fields);

    return () => {
      document.title = productName;
    };
  }, [productName, tagSlug]);

  return null;
}
