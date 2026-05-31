import { describe, expect, it } from 'vitest';
import {
  parseArticle,
  parseArticleSource,
  renderArticleMarkdown,
} from './parseArticle.js';

const validFrontmatter = `---
title: Test Article
description: ${'x'.repeat(50)}
date: 2026-05-30
tags:
  - glossary
---

Body paragraph.
`;

describe('parseArticle', () => {
  it('parses frontmatter and renders markdown', () => {
    const article = parseArticle('test-article.md', validFrontmatter);
    expect(article.slug).toBe('test-article');
    expect(article.frontmatter.title).toBe('Test Article');
    expect(article.html).toContain('<p>Body paragraph.</p>');
    expect(article.readingTimeMinutes).toBeGreaterThan(0);
  });

  it('uses explicit slug from frontmatter', () => {
    const raw = validFrontmatter.replace('tags:', 'slug: custom-slug\ntags:');
    expect(parseArticleSource('ignored.md', raw).slug).toBe('custom-slug');
  });

  it('throws on invalid frontmatter', () => {
    expect(() => parseArticle('bad.md', '---\ntitle: x\n---\n\nBody')).toThrow(
      /invalid frontmatter/
    );
  });

  it('renderArticleMarkdown returns html, reading time, and excerpt', () => {
    const rendered = renderArticleMarkdown('Hello **world**.');
    expect(rendered.html).toContain('<strong>world</strong>');
    expect(rendered.excerpt).toContain('Hello world');
  });
});
