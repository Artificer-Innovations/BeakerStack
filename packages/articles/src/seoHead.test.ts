import { describe, expect, it } from 'vitest';
import {
  applyPrerenderDocument,
  buildArticlePrerenderHead,
  buildArticlesIndexPrerenderHead,
  buildTagPrerenderHead,
  escapeHtmlAttr,
} from './seoHead.js';

const manifest = {
  siteOrigin: 'https://beakerstack.com',
  publisherName: 'Beaker Stack',
  defaultOgImage: '/og-image.png',
};

const config = {
  ...manifest,
  productName: 'Beaker Stack',
};

const article = {
  slug: 'what-is-mcp',
  title: 'What Is MCP?',
  description: 'Plain-English explainer of Model Context Protocol.',
  date: '2026-05-28',
  updated: '2026-05-29',
  tags: ['glossary', 'mcp'],
  readingTimeMinutes: 4,
  excerpt: 'Model Context Protocol is the plumbing layer.',
  html: '<p>Body</p>',
  relatedSlugs: [],
};

const template = `<!doctype html>
<html>
  <head>
    <title>Default</title>
    <meta name="description" content="Default description" />
    <meta property="og:title" content="Default OG" />
    <meta property="og:description" content="Default OG description" />
    <meta name="twitter:title" content="Default Twitter" />
    <meta name="twitter:description" content="Default Twitter description" />
  </head>
  <body><div id="root"></div></body>
</html>`;

describe('seoHead', () => {
  it('escapes html attribute values', () => {
    expect(escapeHtmlAttr(`A "quoted" & <tag>`)).toBe(
      'A &quot;quoted&quot; &amp; &lt;tag&gt;'
    );
  });

  it('builds article head payload with canonical, og, and json-ld', () => {
    const payload = buildArticlePrerenderHead(article, manifest, config);
    expect(payload.pageTitle).toBe('What Is MCP? | Beaker Stack');
    expect(payload.description).toBe(article.description);
    expect(payload.injectBeforeHeadClose).toContain(
      'rel="canonical" href="https://beakerstack.com/articles/what-is-mcp"'
    );
    expect(payload.injectBeforeHeadClose).toContain('property="og:type"');
    expect(payload.injectBeforeHeadClose).toContain('BlogPosting');
    expect(payload.injectBeforeHeadClose).toContain('article:modified_time');
  });

  it('omits modified time when article.updated is absent', () => {
    const { updated: _updated, ...articleWithoutUpdated } = article;
    const payload = buildArticlePrerenderHead(
      articleWithoutUpdated,
      manifest,
      config
    );
    expect(payload.injectBeforeHeadClose).not.toContain(
      'article:modified_time'
    );
  });

  it('normalizes trailing-slash origins and bare paths', () => {
    const trailingSlashManifest = {
      ...manifest,
      siteOrigin: 'https://beakerstack.com/',
      defaultOgImage: 'og-image.png',
    };
    const payload = buildArticlesIndexPrerenderHead(
      trailingSlashManifest,
      config
    );
    expect(payload.injectBeforeHeadClose).toContain(
      'href="https://beakerstack.com/articles"'
    );
    expect(payload.injectBeforeHeadClose).toContain(
      'content="https://beakerstack.com/og-image.png"'
    );
  });

  it('builds articles index and tag head payloads', () => {
    const index = buildArticlesIndexPrerenderHead(manifest, config);
    expect(index.pageTitle).toBe('Articles | Beaker Stack');
    expect(index.injectBeforeHeadClose).toContain('/articles"');

    const tag = buildTagPrerenderHead('mcp', manifest, config, 'mcp');
    expect(tag.pageTitle).toBe('mcp | Articles | Beaker Stack');
    expect(tag.injectBeforeHeadClose).toContain('/articles/tags/mcp');
  });

  it('applies prerender payload to html template', () => {
    const payload = buildArticlePrerenderHead(article, manifest, config);
    const html = applyPrerenderDocument(
      template,
      payload,
      '<main><h1>What Is MCP?</h1></main>'
    );

    expect(html).toContain('<title>What Is MCP? | Beaker Stack</title>');
    expect(html).toContain(
      '<meta name="description" content="Plain-English explainer of Model Context Protocol." />'
    );
    expect(html).toContain('<main><h1>What Is MCP?</h1></main>');
    expect(html).not.toContain('<div id="root"></div>');
    expect(html.match(/property="og:title"/g)?.length).toBe(1);
    expect(html.match(/name="twitter:title"/g)?.length).toBe(1);
  });

  it('escapes dollar signs in replacement values', () => {
    const payload = buildArticlePrerenderHead(
      {
        ...article,
        title: 'Price $& today',
        description: 'Save $1 on $& plans',
      },
      manifest,
      config
    );
    const html = applyPrerenderDocument(template, payload, '<main></main>');
    expect(html).toContain('<title>Price $&amp; today | Beaker Stack</title>');
    expect(html).toContain('content="Save $1 on $&amp; plans"');
  });

  it('escapes closing script sequences in json-ld', () => {
    const payload = buildArticlePrerenderHead(
      {
        ...article,
        title: 'Safe </script> title',
      },
      manifest,
      config
    );
    expect(payload.injectBeforeHeadClose).toContain('\\u003c/script');
    expect(payload.injectBeforeHeadClose).not.toContain('</script></script>');
  });
});
