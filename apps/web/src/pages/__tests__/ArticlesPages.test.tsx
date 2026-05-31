import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ArticlePage from '../ArticlePage';
import ArticlesTagPage from '../ArticlesTagPage';

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

vi.mock('../../components/PolicyPublicHeader', () => ({
  PolicyPublicHeader: () => <div data-testid='public-header' />,
}));

describe('ArticlePage', () => {
  it('renders a known article', () => {
    render(
      <MemoryRouter
        initialEntries={['/articles/getting-started-with-beaker-stack']}
      >
        <Routes>
          <Route path='/articles/:slug' element={<ArticlePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('public-header')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Getting Started with Beaker Stack',
        level: 1,
      })
    ).toBeInTheDocument();
  });

  it('redirects unknown slugs to the index', () => {
    render(
      <MemoryRouter initialEntries={['/articles/missing-slug']}>
        <Routes>
          <Route path='/articles' element={<div>Articles index</div>} />
          <Route path='/articles/:slug' element={<ArticlePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Articles index')).toBeInTheDocument();
  });
});

describe('ArticlesTagPage', () => {
  it('renders articles for a known tag', () => {
    render(
      <MemoryRouter initialEntries={['/articles/tags/guide']}>
        <Routes>
          <Route path='/articles/tags/:tag' element={<ArticlesTagPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'guide', level: 1 })
    ).toBeInTheDocument();
  });

  it('redirects unknown tags to the index', () => {
    render(
      <MemoryRouter initialEntries={['/articles/tags/unknown-tag']}>
        <Routes>
          <Route path='/articles' element={<div>Articles index</div>} />
          <Route path='/articles/tags/:tag' element={<ArticlesTagPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Articles index')).toBeInTheDocument();
  });
});
