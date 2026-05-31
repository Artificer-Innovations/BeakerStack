import { describe, expect, it } from 'vitest';
import {
  extractInternalArticleLinks,
  validateInternalLinks,
} from '../src/extractInternalLinks.js';

describe('extractInternalArticleLinks', () => {
  it('finds markdown and html article links', () => {
    const body = `
See [MCP](/articles/what-is-mcp) and <a href="/articles/oauth-vs-api-keys-mcp">OAuth</a>.
`;
    expect(extractInternalArticleLinks(body).sort()).toEqual([
      'oauth-vs-api-keys-mcp',
      'what-is-mcp',
    ]);
  });
});

describe('validateInternalLinks', () => {
  it('returns errors for unknown slugs', () => {
    const errors = validateInternalLinks([
      { slug: 'a', body: '[missing](/articles/not-real)' },
    ]);
    expect(errors).toEqual(['a: broken internal link to /articles/not-real']);
  });
});
