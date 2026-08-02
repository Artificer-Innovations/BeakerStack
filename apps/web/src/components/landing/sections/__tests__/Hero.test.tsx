import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Hero } from '../Hero';
import type { CarouselSlide } from '../Hero';

const baseConfig = {
  headline: 'Build the full stack. Not the scaffolding.',
  subhead: 'BeakerStack ships with everything a SaaS needs.',
  primaryCta: { label: 'Get started free', href: '/signup' },
  mediaSrc: 'https://placehold.co/600x338?text=Dashboard',
  mediaAlt: 'Dashboard preview',
};

describe('Hero', () => {
  it('renders the headline and subhead', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', {
        name: 'Build the full stack. Not the scaffolding.',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('BeakerStack ships with everything a SaaS needs.')
    ).toBeInTheDocument();
  });

  it('renders the primary CTA link', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: 'Get started free' })
    ).toBeInTheDocument();
  });

  it('renders the hero image with eager loading', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    const img = screen.getByAltText('Dashboard preview');
    expect(img).toHaveAttribute(
      'src',
      'https://placehold.co/600x338?text=Dashboard'
    );
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('renders eyebrow text when provided', () => {
    render(
      <MemoryRouter>
        <Hero
          config={{ ...baseConfig, eyebrow: 'Open source SaaS template' }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Open source SaaS template')).toBeInTheDocument();
  });

  it('does not render eyebrow when absent', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    expect(
      screen.queryByText('Open source SaaS template')
    ).not.toBeInTheDocument();
  });

  it('renders secondary CTA when provided', () => {
    render(
      <MemoryRouter>
        <Hero
          config={{
            ...baseConfig,
            secondaryCta: {
              label: 'View on GitHub',
              href: 'https://github.com/Artificer-Innovations/BeakerStack',
            },
          }}
        />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: 'View on GitHub' })
    ).toBeInTheDocument();
  });

  it('does not render secondary CTA when absent', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('renders trust strip when provided', () => {
    render(
      <MemoryRouter>
        <Hero
          config={{
            ...baseConfig,
            trustStrip: 'MIT licensed · No vendor lock-in',
          }}
        />
      </MemoryRouter>
    );
    expect(
      screen.getByText('MIT licensed · No vendor lock-in')
    ).toBeInTheDocument();
  });

  it('does not render trust strip when absent', () => {
    render(
      <MemoryRouter>
        <Hero config={baseConfig} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/MIT licensed/)).not.toBeInTheDocument();
  });

  describe('crossfade carousel', () => {
    const slides: CarouselSlide[] = [
      {
        subhead: 'Hero subhead text.',
        mediaSrc: 'https://placehold.co/600x338?text=Hero',
        mediaAlt: 'Hero image',
      },
      {
        label: 'Feature one title',
        subhead: 'Feature one body copy.',
        mediaSrc: 'https://placehold.co/600x338?text=Feature1',
        mediaAlt: 'Feature one image',
      },
      {
        label: 'Feature two title',
        subhead: 'Feature two body copy.',
        mediaSrc: 'https://placehold.co/600x338?text=Feature2',
        mediaAlt: 'Feature two image',
      },
    ];

    function mockMatchMedia(prefersReducedMotion: boolean) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockReturnValue({
          matches: prefersReducedMotion,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      });
    }

    let originalMatchMedia: typeof window.matchMedia | undefined;

    beforeEach(() => {
      vi.useFakeTimers();
      originalMatchMedia = window.matchMedia;
      mockMatchMedia(false);
    });

    afterEach(() => {
      vi.useRealTimers();
      // Restore original matchMedia so the vi.fn() stub doesn't leak into other test files
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: originalMatchMedia,
      });
    });

    it('renders slide 0 visible and others aria-hidden initially', () => {
      render(
        <MemoryRouter>
          <Hero config={baseConfig} carouselSlides={slides} intervalMs={100} />
        </MemoryRouter>
      );
      // aria-hidden lives on the slide container div; text is inside a <p> child
      expect(
        screen.getByText('Hero subhead text.').parentElement
      ).not.toHaveAttribute('aria-hidden');
      expect(
        screen.getByText('Feature one body copy.').parentElement
      ).toHaveAttribute('aria-hidden', 'true');
      // All images are always mounted — opacity transitions fire in both directions
      expect(screen.getByAltText('Hero image')).not.toHaveAttribute(
        'aria-hidden'
      );
      expect(screen.getByAltText('Feature one image')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
      expect(screen.getByAltText('Feature two image')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
    });

    it('advances to slide 1 after one interval', () => {
      render(
        <MemoryRouter>
          <Hero config={baseConfig} carouselSlides={slides} intervalMs={100} />
        </MemoryRouter>
      );
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(
        screen.getByText('Hero subhead text.').parentElement
      ).toHaveAttribute('aria-hidden', 'true');
      expect(
        screen.getByText('Feature one body copy.').parentElement
      ).not.toHaveAttribute('aria-hidden');
      // Both images remain mounted; slide 0 now aria-hidden, slide 1 active
      expect(screen.getByAltText('Hero image')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
      expect(screen.getByAltText('Feature one image')).not.toHaveAttribute(
        'aria-hidden'
      );
    });

    it('wraps back to slide 0 after all slides advance', () => {
      render(
        <MemoryRouter>
          <Hero config={baseConfig} carouselSlides={slides} intervalMs={100} />
        </MemoryRouter>
      );
      act(() => {
        vi.advanceTimersByTime(300); // 3 intervals → wraps to index 0
      });
      expect(
        screen.getByText('Hero subhead text.').parentElement
      ).not.toHaveAttribute('aria-hidden');
    });

    it('still advances when prefers-reduced-motion is set (no fade transition)', () => {
      mockMatchMedia(true);
      render(
        <MemoryRouter>
          <Hero config={baseConfig} carouselSlides={slides} intervalMs={100} />
        </MemoryRouter>
      );
      const slide1 = screen.getByText('Feature one body copy.').parentElement;
      if (!slide1) throw new Error('expected slide container element');
      expect(slide1.className).not.toContain('transition-opacity');
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(
        screen.getByText('Hero subhead text.').parentElement
      ).toHaveAttribute('aria-hidden', 'true');
      expect(slide1).not.toHaveAttribute('aria-hidden');
    });

    it('slide 0 has eager loading; all other slides have lazy loading', () => {
      render(
        <MemoryRouter>
          <Hero config={baseConfig} carouselSlides={slides} intervalMs={100} />
        </MemoryRouter>
      );
      // All images are mounted from the start — loading attributes are fixed, not dynamic
      expect(screen.getByAltText('Hero image')).toHaveAttribute(
        'loading',
        'eager'
      );
      expect(screen.getByAltText('Feature one image')).toHaveAttribute(
        'loading',
        'lazy'
      );
      expect(screen.getByAltText('Feature two image')).toHaveAttribute(
        'loading',
        'lazy'
      );
      // Images remain mounted after advancing — the DOM doesn't change, only opacity
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByAltText('Hero image')).toBeInTheDocument();
      expect(screen.getByAltText('Feature one image')).toBeInTheDocument();
      expect(screen.getByAltText('Feature two image')).toBeInTheDocument();
    });

    it('renders feature row label text for non-hero slides', () => {
      render(
        <MemoryRouter>
          <Hero config={baseConfig} carouselSlides={slides} intervalMs={100} />
        </MemoryRouter>
      );
      expect(screen.getByText('Feature one title')).toBeInTheDocument();
      expect(screen.getByText('Feature two title')).toBeInTheDocument();
    });
  });
});
