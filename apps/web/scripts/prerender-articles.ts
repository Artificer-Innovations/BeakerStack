/* eslint-disable no-console -- build script */
/* eslint-disable @typescript-eslint/no-explicit-any -- WebSocket stub for SSR build */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import type { ReactElement } from 'react';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class WebSocket {
    constructor(_url: string) {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

const { configureAdopter } =
  await import('../../../packages/shared/src/config/adopterRuntime');
const { adopterConfig } = await import('../../../adopter/config/index');

configureAdopter(adopterConfig);

const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { MemoryRouter } = await import('react-router-dom');
const { ThemeProvider } = await import('../src/contexts/ThemeContext');
const { ARTICLES } =
  await import('../../../packages/articles/src/generated/articles.ts');
const { getTagLabel } = await import('../../../packages/articles/src/web.ts');
const {
  applyPrerenderDocument,
  buildArticlePrerenderHead,
  buildArticlesIndexPrerenderHead,
  buildTagPrerenderHead,
} = await import('../../../packages/articles/src/seoHead.ts');
const { getAdopterConfig } =
  await import('../../../packages/shared/src/config/adopterRuntime');
const { ArticlesIndexSSR, ArticleDetailSSR, TagListingSSR } =
  await import('../src/components/articles/ArticlesPublicSSR.tsx');
const { ARTICLES_INDEX_SUBTITLE } = await import('../src/lib/articlesCopy.ts');

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(webRoot, 'dist');
const outDir = join(distDir, 'prerender-articles');
const template = readFileSync(join(distDir, 'index.html'), 'utf8');

const { branding } = getAdopterConfig();
const seoConfig = {
  siteOrigin: ARTICLES.siteOrigin,
  publisherName: ARTICLES.publisherName,
  defaultOgImage: ARTICLES.defaultOgImage,
  productName: branding.displayName,
};

let basePath = process.env.VITE_BASE_PATH ?? '/';
if (!basePath.startsWith('/')) basePath = `/${basePath}`;
basePath = basePath.replace(/\/+$/, '');
const routerBasename =
  basePath === '' || basePath === '/' ? undefined : basePath;

function withBasePath(route: string): string {
  if (basePath === '' || basePath === '/') return route;
  return `${basePath}${route}`;
}

function renderRoute(path: string, element: ReactElement): string {
  return renderToStaticMarkup(
    createElement(
      ThemeProvider,
      null,
      createElement(
        MemoryRouter,
        { basename: routerBasename, initialEntries: [path] },
        element
      )
    )
  );
}

function writePrerender(
  relativePath: string,
  payload: ReturnType<typeof buildArticlePrerenderHead>,
  bodyHtml: string
): void {
  const outputPath = join(outDir, relativePath);
  mkdirSync(dirname(outputPath), { recursive: true });
  const html = applyPrerenderDocument(template, payload, bodyHtml);
  writeFileSync(outputPath, html);
}

mkdirSync(outDir, { recursive: true });

const indexBody = renderRoute(
  withBasePath('/articles'),
  createElement(ArticlesIndexSSR, {
    productName: branding.displayName,
    indexSubtitle: ARTICLES_INDEX_SUBTITLE,
  })
);
writePrerender(
  'index.html',
  buildArticlesIndexPrerenderHead(ARTICLES, seoConfig),
  indexBody
);

if (!indexBody.includes('<h1')) {
  console.error('pre-render smoke check: articles index missing <h1>');
  process.exit(1);
}

for (const article of ARTICLES.articles) {
  const path = withBasePath(`/articles/${article.slug}`);
  const body = renderRoute(
    path,
    createElement(ArticleDetailSSR, {
      slug: article.slug,
      productName: branding.displayName,
    })
  );
  writePrerender(
    `${article.slug}.html`,
    buildArticlePrerenderHead(article, ARTICLES, seoConfig),
    body
  );

  if (!body.includes('<h1')) {
    console.error(`pre-render smoke check: ${article.slug} missing <h1>`);
    process.exit(1);
  }
}

for (const tagSlug of Object.keys(ARTICLES.tagIndex)) {
  const path = withBasePath(`/articles/tags/${tagSlug}`);
  const body = renderRoute(
    path,
    createElement(TagListingSSR, {
      tagSlug,
      productName: branding.displayName,
    })
  );
  const label = getTagLabel(tagSlug) ?? tagSlug;

  writePrerender(
    join('tags', `${tagSlug}.html`),
    buildTagPrerenderHead(label, ARTICLES, seoConfig, tagSlug),
    body
  );

  if (!body.includes('<h1')) {
    console.error(`pre-render smoke check: tag ${tagSlug} missing <h1>`);
    process.exit(1);
  }
}

console.log(
  `pre-render articles complete — index + ${ARTICLES.articles.length} articles + ${Object.keys(ARTICLES.tagIndex).length} tags`
);
