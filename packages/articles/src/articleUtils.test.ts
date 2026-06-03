import { describe, expect, it } from 'vitest';
import {
  buildExcerpt,
  computeReadingTimeMinutes,
  markdownToPlainText,
  slugifyFilename,
  slugifyTag,
} from './articleUtils.js';

describe('articleUtils', () => {
  it('slugifies filenames and tags', () => {
    expect(slugifyFilename('What Is MCP.md')).toBe('what-is-mcp');
    expect(slugifyTag('OAuth / Trust')).toBe('oauth-trust');
  });

  it('computes reading time with a minimum of one minute', () => {
    expect(computeReadingTimeMinutes('one two three')).toBe(1);
    expect(computeReadingTimeMinutes(`${'word '.repeat(400)}`)).toBeGreaterThan(
      1
    );
  });

  it('strips markdown to plain text', () => {
    expect(markdownToPlainText('[link](/articles/foo)')).toBe('link');
    expect(markdownToPlainText('- item\n\n# Title')).toContain('item');
  });

  it('leaves malformed bracket syntax unchanged', () => {
    expect(markdownToPlainText('[unclosed')).toBe('[unclosed');
    expect(markdownToPlainText('[not a link]')).toBe('[not a link]');
    expect(markdownToPlainText('[open](no-close')).toBe('[open](no-close');
  });

  it('builds excerpts and truncates long copy', () => {
    expect(buildExcerpt('Short text')).toBe('Short text');
    const long = 'word '.repeat(80);
    expect(buildExcerpt(long, 40)).toMatch(/…$/);
    expect(buildExcerpt(long, 40).length).toBeLessThanOrEqual(40);
  });
});
