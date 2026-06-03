import { describe, expect, it } from 'vitest';
import { sanitizeHelpHtml } from './sanitizeHelpHtml.js';

describe('sanitizeHelpHtml', () => {
  it('strips script tags including spaced end tags', () => {
    expect(
      sanitizeHelpHtml('<p><script >alert(1)</script >Hello</p>')
    ).not.toContain('<script');
    expect(sanitizeHelpHtml('<p><script>alert(1)</script>Hello</p>')).toBe(
      '<p>Hello</p>'
    );
  });

  it('removes event handler attributes', () => {
    expect(sanitizeHelpHtml('<img src="x" onerror="alert(1)">')).not.toContain(
      'onerror'
    );
  });

  it('neutralises javascript: hrefs', () => {
    const output = sanitizeHelpHtml('<a href="javascript:alert(1)">x</a>');
    expect(output).not.toContain('javascript:');
  });
});
