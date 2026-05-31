import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const mockArticlesManifest = vi.hoisted(() => ({
  siteOrigin: 'https://beakerstack.com',
  publisherName: 'Beaker Stack',
  defaultOgImage: '/og-image.png',
  articles: [
    {
      slug: 'best-ai-memory-tools-2026',
      title: 'Best AI Memory Tools in 2026',
      description:
        'An honest map of AI memory tools by tier and substrate vs destination.',
      date: '2026-05-30',
      tags: ['comparison', 'substrate'],
      snapshotDate: '2026-05-30',
      readingTimeMinutes: 5,
      excerpt: 'Most best AI memory lists mix four different businesses.',
      html: '<p>Category map.</p>',
      relatedSlugs: ['what-is-mcp'],
    },
    {
      slug: 'what-is-mcp',
      title: 'What Is MCP?',
      description:
        'Plain-English explainer of Model Context Protocol for cross-tool AI memory.',
      date: '2026-05-28',
      updated: '2026-05-29',
      tags: ['glossary', 'mcp', 'substrate'],
      keywords: ['what is mcp'],
      readingTimeMinutes: 4,
      excerpt: 'Model Context Protocol is the plumbing layer for AI tools.',
      html: '<p>Model Context Protocol is the plumbing layer.</p>',
      relatedSlugs: ['best-ai-memory-tools-2026'],
    },
    {
      slug: 'solo-article',
      title: 'Solo Article',
      description:
        'Plain-English explainer of Model Context Protocol for cross-tool AI memory.',
      date: '2026-05-27',
      tags: ['glossary'],
      readingTimeMinutes: 2,
      excerpt: 'Solo article excerpt.',
      html: '<p>Solo</p>',
      relatedSlugs: ['missing-related'],
    },
  ],
  tagIndex: {
    comparison: ['best-ai-memory-tools-2026'],
    substrate: ['best-ai-memory-tools-2026', 'what-is-mcp'],
    glossary: ['what-is-mcp', 'solo-article'],
    mcp: ['what-is-mcp'],
    orphan: ['solo-article'],
  },
}));

vi.mock('../generated/articles.js', () => ({
  ARTICLES: mockArticlesManifest,
}));

import { ArticleDetail } from './ArticleDetail.web.js';
import { ArticleHead, ArticlesIndexHead } from './ArticleHead.web.js';
import {
  ArticleMeta,
  ArticleProse,
  formatArticleDate,
} from './ArticleProse.web.js';
import { ArticlesIndex } from './ArticlesIndex.web.js';
import { TagListing } from './TagListing.web.js';

const [comparisonArticle, mcpArticle] = mockArticlesManifest.articles;
if (!comparisonArticle || !mcpArticle) {
  throw new Error('mock article fixtures missing');
}
const mockArticle = mcpArticle;

describe('ArticleProse', () => {
  it('renders sanitized html', () => {
    render(<ArticleProse html='<p>Hello</p>' />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('formats article dates and invalid fallback', () => {
    expect(formatArticleDate('2026-05-30')).toContain('2026');
    expect(formatArticleDate('invalid')).toBe('invalid');
  });
});

describe('ArticleMeta', () => {
  it('renders dates and clickable tag links', () => {
    render(
      <MemoryRouter>
        <ArticleMeta article={mcpArticle} />
      </MemoryRouter>
    );
    expect(screen.getByText(/min read/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'glossary' })).toHaveAttribute(
      'href',
      '/articles/tags/glossary'
    );
  });

  it('does not render snapshot disclaimer banner', () => {
    render(
      <MemoryRouter>
        <ArticleMeta article={comparisonArticle} />
      </MemoryRouter>
    );
    expect(
      screen.queryByText(/Competitor facts snapshot/)
    ).not.toBeInTheDocument();
  });
});

describe('ArticleHead', () => {
  it('sets document title and meta tags, then restores on unmount', () => {
    const articleWithoutUpdated = {
      ...mockArticle,
      updated: undefined,
    };
    delete (articleWithoutUpdated as { updated?: string }).updated;
    const { unmount } = render(
      <ArticleHead article={articleWithoutUpdated} productName='Beaker Stack' />
    );
    expect(document.title).toBe('What Is MCP? | Beaker Stack');
    expect(
      document.head.querySelector('meta[name="description"]')
    ).toHaveAttribute('content', mockArticle.description);
    expect(
      document.head.querySelector('link[rel="canonical"]')
    ).toHaveAttribute('href', 'https://beakerstack.com/articles/what-is-mcp');
    expect(
      document.head.querySelector('script[data-article-jsonld="what-is-mcp"]')
    ).toBeTruthy();

    unmount();
    expect(document.title).toBe('Beaker Stack');
  });

  it('updates existing head tags on rerender', () => {
    const { rerender } = render(
      <ArticleHead article={mockArticle} productName='Beaker Stack' />
    );
    rerender(
      <ArticleHead
        article={{ ...mockArticle, title: 'Updated Title' }}
        productName='Beaker Stack'
      />
    );
    expect(document.title).toBe('Updated Title | Beaker Stack');
  });

  it('creates one article:tag meta element per tag', () => {
    render(<ArticleHead article={mockArticle} productName='Beaker Stack' />);
    const tags = document.head.querySelectorAll('meta[property="article:tag"]');
    expect(tags).toHaveLength(mockArticle.tags.length);
    expect(tags[0]).toHaveAttribute('content', 'glossary');
    expect(tags[1]).toHaveAttribute('content', 'mcp');
  });

  it('clears article-only meta when navigating to the index head', () => {
    const { unmount } = render(
      <ArticleHead article={mockArticle} productName='Beaker Stack' />
    );
    expect(
      document.head.querySelector('meta[property="article:published_time"]')
    ).toBeTruthy();
    unmount();
    render(<ArticlesIndexHead productName='Beaker Stack' />);
    expect(
      document.head.querySelector('meta[property="article:published_time"]')
    ).toBeNull();
    expect(
      document.head.querySelector('script[data-article-jsonld]')
    ).toBeNull();
    expect(
      document.head.querySelectorAll('meta[property="article:tag"]')
    ).toHaveLength(0);
  });
});

describe('ArticlesIndexHead', () => {
  it('sets index page metadata with custom description', () => {
    render(
      <ArticlesIndexHead productName='Beaker Stack' description='Custom desc' />
    );
    expect(document.title).toBe('Articles | Beaker Stack');
    expect(
      document.head.querySelector('meta[name="description"]')
    ).toHaveAttribute('content', 'Custom desc');
  });
});

describe('ArticlesIndex', () => {
  it('lists articles with links and tags', () => {
    render(
      <MemoryRouter>
        <ArticlesIndex productName='Beaker Stack' />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'Articles', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'What Is MCP?' })).toHaveAttribute(
      'href',
      '/articles/what-is-mcp'
    );
    expect(screen.getByRole('link', { name: 'mcp' })).toHaveAttribute(
      'href',
      '/articles/tags/mcp'
    );
  });

  it('forwards a custom description to the page head', () => {
    render(
      <MemoryRouter>
        <ArticlesIndex
          productName='Beaker Stack'
          description='Custom articles desc'
        />
      </MemoryRouter>
    );
    expect(
      document.head.querySelector('meta[name="description"]')
    ).toHaveAttribute('content', 'Custom articles desc');
  });
});

describe('ArticleDetail', () => {
  it('renders article content and related links', () => {
    render(
      <MemoryRouter>
        <ArticleDetail slug='what-is-mcp' productName='Beaker Stack' />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'What Is MCP?', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/plumbing layer/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Best AI Memory Tools in 2026' })
    ).toHaveAttribute('href', '/articles/best-ai-memory-tools-2026');
  });

  it('returns null for unknown slug', () => {
    const { container } = render(
      <MemoryRouter>
        <ArticleDetail slug='missing' productName='Beaker Stack' />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('omits related block when related slugs do not resolve', () => {
    render(
      <MemoryRouter>
        <ArticleDetail slug='solo-article' productName='Beaker Stack' />
      </MemoryRouter>
    );
    expect(screen.queryByText('Related articles')).not.toBeInTheDocument();
  });
});

describe('TagListing', () => {
  it('lists articles for a tag', () => {
    render(
      <MemoryRouter>
        <TagListing tagSlug='mcp' productName='Beaker Stack' />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'mcp', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'What Is MCP?' })
    ).toBeInTheDocument();
  });

  it('falls back to the tag slug when no label is found', () => {
    render(
      <MemoryRouter>
        <TagListing tagSlug='orphan' productName='Beaker Stack' />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { name: 'orphan', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Solo Article' })
    ).toBeInTheDocument();
  });
});
