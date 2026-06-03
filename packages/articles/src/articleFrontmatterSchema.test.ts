import { describe, expect, it } from 'vitest';
import { articleFrontmatterSchema } from '../src/articleFrontmatterSchema.js';

describe('articleFrontmatterSchema', () => {
  it('requires snapshotDate for comparison tags', () => {
    const result = articleFrontmatterSchema.safeParse({
      title: 'Test',
      description: 'x'.repeat(50),
      date: '2026-05-30',
      tags: ['comparison'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid frontmatter', () => {
    const result = articleFrontmatterSchema.safeParse({
      title: 'Test',
      description: 'x'.repeat(50),
      date: '2026-05-30',
      tags: ['glossary'],
    });
    expect(result.success).toBe(true);
  });
});
