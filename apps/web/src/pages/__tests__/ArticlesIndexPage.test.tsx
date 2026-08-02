import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import ArticlesIndexPage from '../ArticlesIndexPage';

vi.mock('@beakerstack/shared/config/adopterRuntime', () => ({
  getAdopterConfig: () => ({
    branding: { displayName: 'Beaker Stack' },
    legal: { contactEmail: 'contact@artificerinnovations.com' },
  }),
}));

vi.mock('@beakerstack/shared/components/layout/ContentContainer.web', () => ({
  ContentContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('ArticlesIndexPage', () => {
  it('renders article index with demo entries', () => {
    render(
      <MemoryRouter>
        <ArticlesIndexPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'Articles', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Getting Started with Beaker Stack' })
    ).toHaveAttribute('href', '/articles/getting-started-with-beaker-stack');
  });
});
