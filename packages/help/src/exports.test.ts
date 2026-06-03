import { describe, expect, it } from 'vitest';
import { HELP_NAV_LINK } from './nav.js';
import { HELP } from './generated/help.js';

describe('package exports', () => {
  it('re-exports nav and generated help from index', async () => {
    const index = await import('./index.js');
    expect(index.HELP_NAV_LINK).toEqual(HELP_NAV_LINK);
  });

  it('re-exports web components', async () => {
    const web = await import('./web.js');
    expect(web.HelpContent).toBeTypeOf('function');
    expect(web.HelpSearch).toBeTypeOf('function');
    expect(web.HelpAccordion).toBeTypeOf('function');
    expect(web.HelpFeedbackForm).toBeTypeOf('function');
    expect(web.filterHelpSections).toBeTypeOf('function');
    expect(web.useHelpSectionFilter).toBeTypeOf('function');
  });

  it('loads generated help content', () => {
    expect(HELP.title).toBeTruthy();
    expect(HELP.sections.length).toBeGreaterThan(0);
  });

  it('exports help nav link', () => {
    expect(HELP_NAV_LINK).toEqual({ label: 'Help', href: '/help' });
  });
});
