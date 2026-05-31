import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  renderHook,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelpContent } from './HelpContent.web.js';
import { HelpFeedbackForm } from './HelpFeedbackForm.web.js';
import { HelpAccordion } from './HelpAccordion.web.js';
import { HelpSearch, useHelpSectionFilter } from './HelpSearch.web.js';
import type { HelpSection } from '../types.js';

vi.mock('../generated/help.js', () => ({
  HELP: {
    title: 'Help & Support',
    subtitle: 'Everything you need to know.',
    sections: [
      {
        id: 'getting-started',
        title: 'Getting Started',
        html: '<p>Start here.</p>',
        searchText: 'Start here.',
      },
      {
        id: 'billing',
        title: 'Plans & Billing',
        html: '<p>Billing details.</p>',
        searchText: 'Billing details.',
      },
    ],
  },
}));

describe('HelpContent', () => {
  const props = {
    contactEmail: 'support@example.com',
    productName: 'Beaker Stack',
  };

  it('renders title, search, sections, and feedback form', () => {
    render(<HelpContent {...props} />);
    expect(
      screen.getByRole('heading', { name: 'Help & Support' })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search help topics…')
    ).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Send us feedback' })
    ).toBeInTheDocument();
  });

  it('filters accordion sections when searching', async () => {
    const user = userEvent.setup();
    render(<HelpContent {...props} />);
    await user.type(
      screen.getByPlaceholderText('Search help topics…'),
      'billing'
    );
    expect(screen.getByText('Plans & Billing')).toBeInTheDocument();
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
  });
});

describe('HelpAccordion', () => {
  const sections: HelpSection[] = [
    {
      id: 'topic',
      title: 'Topic',
      html: '<p>Body</p>',
      searchText: 'Body',
    },
  ];

  it('shows empty state when no sections match', () => {
    render(<HelpAccordion sections={[]} />);
    expect(
      screen.getByText('No topics match your search.')
    ).toBeInTheDocument();
  });

  it('opens sections when forceOpen is true', () => {
    render(<HelpAccordion sections={sections} forceOpen />);
    expect(screen.getByText('Body')).toBeVisible();
  });
});

describe('HelpSearch', () => {
  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<HelpSearch value='' onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Search help topics…'), {
      target: { value: 'billing' },
    });
    expect(onChange).toHaveBeenCalledWith('billing');
  });

  it('filters sections through useHelpSectionFilter', () => {
    const sections: HelpSection[] = [
      {
        id: 'a',
        title: 'Alpha',
        html: '<p>a</p>',
        searchText: 'alpha text',
      },
      {
        id: 'b',
        title: 'Beta',
        html: '<p>b</p>',
        searchText: 'beta text',
      },
    ];
    const { result } = renderHook(() => useHelpSectionFilter(sections));
    expect(result.current.filteredSections).toHaveLength(2);
    act(() => {
      result.current.setQuery('beta');
    });
    expect(result.current.isFiltering).toBe(true);
    expect(result.current.filteredSections).toEqual([sections[1]]);
  });
});

describe('HelpFeedbackForm', () => {
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

  beforeEach(() => {
    openSpy.mockClear();
  });

  it('opens mailto with encoded subject and body', () => {
    render(
      <HelpFeedbackForm
        contactEmail='support@example.com'
        productName='Beaker Stack'
      />
    );
    fireEvent.change(
      screen.getByPlaceholderText("Tell us what's on your mind…"),
      {
        target: { value: 'Hello team' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }));
    expect(openSpy).toHaveBeenCalledWith(
      'mailto:support@example.com?subject=Beaker%20Stack%20feedback&body=Hello%20team',
      '_blank'
    );
    expect(
      screen.getByPlaceholderText("Tell us what's on your mind…")
    ).toHaveValue('');
  });

  it('ignores whitespace-only submissions', () => {
    render(
      <HelpFeedbackForm
        contactEmail='support@example.com'
        productName='Beaker Stack'
      />
    );
    fireEvent.change(
      screen.getByPlaceholderText("Tell us what's on your mind…"),
      {
        target: { value: '   ' },
      }
    );
    const form = screen
      .getByRole('button', { name: 'Send Feedback' })
      .closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    expect(openSpy).not.toHaveBeenCalled();
  });
});
