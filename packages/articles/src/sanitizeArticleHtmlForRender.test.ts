import { describe, expect, it, vi } from 'vitest';
import { sanitizeArticleHtmlForRender } from './sanitizeArticleHtmlForRender.js';

describe('sanitizeArticleHtmlForRender', () => {
  it('passes through html when window is unavailable', () => {
    vi.stubGlobal('window', undefined);
    expect(sanitizeArticleHtmlForRender('<p>Hello</p>')).toBe('<p>Hello</p>');
    vi.unstubAllGlobals();
  });

  it('sanitizes html in the browser', () => {
    expect(
      sanitizeArticleHtmlForRender('<img src="x" onerror="alert(1)">')
    ).not.toContain('onerror');
  });
});
