import { describe, it, expect } from 'vitest';
import { filterHelpSections } from './HelpSearch.web.js';
import type { HelpSection } from '../types.js';

const sections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    html: '<p>Sign up and connect MCP.</p>',
    searchText: 'Sign up and connect MCP.',
  },
  {
    id: 'billing',
    title: 'Plans & Billing',
    html: '<p>Compare plans on billing.</p>',
    searchText: 'Compare plans on billing.',
  },
];

describe('filterHelpSections', () => {
  it('returns all sections when query is empty', () => {
    expect(filterHelpSections(sections, '')).toHaveLength(2);
    expect(filterHelpSections(sections, '   ')).toHaveLength(2);
  });

  it('filters by title case-insensitively', () => {
    expect(filterHelpSections(sections, 'billing')).toEqual([sections[1]]);
  });

  it('filters by search text', () => {
    expect(filterHelpSections(sections, 'connect mcp')).toEqual([sections[0]]);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterHelpSections(sections, 'zzzzz')).toEqual([]);
  });
});
