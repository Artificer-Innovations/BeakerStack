import { describe, expect, it } from 'vitest';
import { renderEmailTemplate } from './renderTemplate.js';

describe('renderEmailTemplate', () => {
  it('replaces all placeholders', () => {
    const out = renderEmailTemplate('Hi {{name}}, link: {{inviteUrl}}', {
      name: 'Ada',
      inviteUrl: 'https://example.com',
    });
    expect(out).toBe('Hi Ada, link: https://example.com');
  });
});
