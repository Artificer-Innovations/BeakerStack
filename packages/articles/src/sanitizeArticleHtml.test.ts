import { describe, expect, it } from 'vitest';
import { sanitizeArticleHtml } from './sanitizeArticleHtml.js';

describe('sanitizeArticleHtml', () => {
  it('strips script tags including spaced end tags', () => {
    expect(
      sanitizeArticleHtml('<p><script >alert(1)</script >Hello</p>')
    ).not.toContain('<script');
    expect(sanitizeArticleHtml('<p><script>alert(1)</script>Hello</p>')).toBe(
      '<p>Hello</p>'
    );
  });

  it('removes event handler attributes', () => {
    expect(
      sanitizeArticleHtml('<img src="x" onerror="alert(1)">')
    ).not.toContain('onerror');
  });

  it('neutralises javascript: hrefs', () => {
    const output = sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>');
    expect(output).not.toContain('javascript:');
  });
});
