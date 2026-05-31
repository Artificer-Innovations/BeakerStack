import { describe, it, expect } from 'vitest';
import { HELP } from './help.js';

describe('HELP generated content', () => {
  it('exports title, subtitle, and sections', () => {
    expect(HELP.title).toBeTruthy();
    expect(HELP.subtitle).toBeTruthy();
    expect(Array.isArray(HELP.sections)).toBe(true);
    expect(HELP.sections.length).toBeGreaterThan(0);
  });

  it('each section has required fields', () => {
    for (const section of HELP.sections) {
      expect(section.id).toMatch(/^[a-z0-9-]+$/);
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.html.length).toBeGreaterThan(0);
      expect(section.searchText.length).toBeGreaterThan(0);
    }
  });

  it('includes expected template help topics', () => {
    const titles = HELP.sections.map(section => section.title);
    expect(titles).toContain('Getting Started');
    expect(titles).toContain('Billing & Plans');
    expect(titles).toContain('Troubleshooting');
  });
});
