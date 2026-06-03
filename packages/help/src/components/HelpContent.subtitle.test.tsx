import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../generated/help.js', () => ({
  HELP: {
    title: 'Help & Support',
    subtitle: '',
    sections: [
      {
        id: 'topic',
        title: 'Topic',
        html: '<p>Body</p>',
        searchText: 'Body',
      },
    ],
  },
}));

import { HelpContent } from './HelpContent.web.js';

describe('HelpContent without subtitle', () => {
  it('renders title without subtitle paragraph', () => {
    render(
      <HelpContent
        contactEmail='support@example.com'
        productName='Beaker Stack'
      />
    );
    expect(
      screen.getByRole('heading', { name: 'Help & Support' })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Everything you need to know.')
    ).not.toBeInTheDocument();
  });
});
