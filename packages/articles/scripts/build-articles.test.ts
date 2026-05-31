import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildArticlesContent,
  buildArticlesManifest,
  discoverArticleFiles,
  renderSitemapXml,
  runCli,
  runIfMainModule,
  shouldRunMain,
} from './build-articles.js';

const validArticle = (slug: string, body = 'Body text.') => `---
title: ${slug.replace(/-/g, ' ')}
description: ${'x'.repeat(50)}
date: 2026-05-30
tags:
  - glossary
---

${body}
`;

describe('discoverArticleFiles', () => {
  it('returns empty array when directory is missing', () => {
    expect(discoverArticleFiles('/path/does/not/exist')).toEqual([]);
  });
});

describe('buildArticlesManifest', () => {
  it('builds demo articles from adopter content', () => {
    const contentDir = join(
      import.meta.dirname,
      '../../../adopter/content/articles'
    );
    const manifest = buildArticlesManifest(contentDir);
    expect(manifest.articles.length).toBeGreaterThanOrEqual(2);
  });

  it('throws on duplicate slugs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'articles-dup-'));
    const duplicateBody = (title: string) => `---
title: ${title}
description: ${'x'.repeat(50)}
date: 2026-05-30
slug: duplicate-slug
tags:
  - glossary
---

Body.
`;
    writeFileSync(join(dir, 'one.md'), duplicateBody('One'), 'utf-8');
    writeFileSync(join(dir, 'two.md'), duplicateBody('Two'), 'utf-8');
    expect(() => buildArticlesManifest(dir)).toThrow(/Duplicate article slugs/);
  });

  it('throws on broken internal links', () => {
    const dir = mkdtempSync(join(tmpdir(), 'articles-links-'));
    writeFileSync(
      join(dir, 'one.md'),
      `${validArticle('one')}\n\n[Missing](/articles/not-there)\n`,
      'utf-8'
    );
    expect(() => buildArticlesManifest(dir)).toThrow(/broken internal link/);
  });

  it('excludes drafts and includes optional frontmatter fields', () => {
    const dir = mkdtempSync(join(tmpdir(), 'articles-draft-'));
    writeFileSync(
      join(dir, 'live.md'),
      validArticle('live').replace(
        'tags:',
        'updated: 2026-05-31\nkeywords:\n  - seo\n  - mcp\ntags:'
      ),
      'utf-8'
    );
    writeFileSync(
      join(dir, 'draft.md'),
      validArticle('draft').replace('tags:', 'draft: true\ntags:'),
      'utf-8'
    );
    const manifest = buildArticlesManifest(dir, 'https://beakerstack.com/');
    expect(manifest.articles).toHaveLength(1);
    expect(manifest.articles[0]?.updated).toBe('2026-05-31');
    expect(manifest.articles[0]?.keywords).toEqual(['seo', 'mcp']);
    expect(manifest.siteOrigin).toBe('https://beakerstack.com');
  });
});

describe('renderSitemapXml', () => {
  it('includes index, articles, and tag pages', () => {
    const dir = mkdtempSync(join(tmpdir(), 'articles-sitemap-'));
    writeFileSync(join(dir, 'live.md'), validArticle('live'), 'utf-8');
    const built = buildArticlesManifest(dir, 'https://beakerstack.com');
    const xml = renderSitemapXml(built);
    expect(xml).toContain('<loc>https://beakerstack.com/articles</loc>');
    expect(xml).toContain('<loc>https://beakerstack.com/articles/live</loc>');
    expect(xml).toContain(
      '<loc>https://beakerstack.com/articles/tags/glossary</loc>'
    );
  });
});

describe('buildArticlesContent', () => {
  it('writes generated manifest and sitemap files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'articles-build-'));
    const contentDir = join(dir, 'content');
    const outputFile = join(dir, 'generated', 'articles.ts');
    const sitemapFile = join(dir, 'sitemap-articles.xml');
    mkdirSync(contentDir, { recursive: true });
    writeFileSync(join(contentDir, 'one.md'), validArticle('one'), 'utf-8');

    const manifest = await buildArticlesContent(
      contentDir,
      outputFile,
      sitemapFile
    );

    expect(manifest.articles).toHaveLength(1);
    expect(readFileSync(outputFile, 'utf-8')).toContain(
      'export const ARTICLES'
    );
    expect(readFileSync(sitemapFile, 'utf-8')).toContain('urlset');
  });
});

describe('shouldRunMain', () => {
  const originalArgv = process.argv[1];

  afterEach(() => {
    process.argv[1] = originalArgv;
  });

  it('returns false when argv is missing or mismatched', () => {
    process.argv[1] = undefined as unknown as string;
    expect(shouldRunMain()).toBe(false);
    expect(shouldRunMain('/tmp/other.ts', import.meta.url)).toBe(false);
  });

  it('returns true when argv matches module url', () => {
    expect(
      shouldRunMain(
        '/tmp/packages/articles/scripts/build-articles.ts',
        'file:///tmp/packages/articles/scripts/build-articles.ts'
      )
    ).toBe(true);
  });
});

describe('main', () => {
  it('builds articles content from provided paths', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'articles-main-'));
    const contentDir = join(dir, 'content');
    const outputFile = join(dir, 'generated', 'articles.ts');
    const sitemapFile = join(dir, 'sitemap-articles.xml');
    mkdirSync(contentDir, { recursive: true });
    writeFileSync(join(contentDir, 'one.md'), validArticle('one'), 'utf-8');

    const { main } = await import('./build-articles.js');
    await expect(
      main(contentDir, outputFile, sitemapFile)
    ).resolves.toBeUndefined();
    expect(readFileSync(outputFile, 'utf-8')).toContain("slug: 'one'");
  });

  it('builds articles content from default repo paths', async () => {
    const { main } = await import('./build-articles.js');
    await expect(main()).resolves.toBeUndefined();
  });
});

describe('runCli', () => {
  it('runs the default main handler', async () => {
    const { runCli } = await import('./build-articles.js');
    await expect(runCli()).resolves.toBeUndefined();
  });

  it('logs and exits when main fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as typeof process.exit);

    await runCli(() => Promise.reject(new Error('boom')));

    expect(errorSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});

describe('runIfMainModule', () => {
  it('invokes cli only when shouldRunMain is true', () => {
    const cli = vi.fn().mockResolvedValue(undefined);
    runIfMainModule(() => true, cli);
    expect(cli).toHaveBeenCalled();
    cli.mockClear();
    runIfMainModule(() => false, cli);
    expect(cli).not.toHaveBeenCalled();
  });
});
