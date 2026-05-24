import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { LandingConfig } from '@adopter/config/landing';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';

export interface CarouselSlide {
  /** Feature row title rendered as a small label above the subhead (omit for hero slide 0). */
  label?: string;
  subhead: string;
  mediaSrc: string;
  mediaAlt: string;
}

/** Derives the carousel slide list from landing config. Shared by LandingPage and LandingPageSSR. */
export function buildCarouselSlides(
  config: Pick<LandingConfig, 'hero' | 'featureRows'>
): CarouselSlide[] {
  return [
    {
      subhead: config.hero.subhead,
      mediaSrc: config.hero.mediaSrc,
      mediaAlt: config.hero.mediaAlt,
    },
    ...config.featureRows.map(r => ({
      label: r.title,
      subhead: r.body,
      mediaSrc: r.mediaSrc,
      mediaAlt: r.mediaAlt,
    })),
  ];
}

interface HeroProps {
  config: LandingConfig['hero'];
  carouselSlides?: CarouselSlide[];
  /** Auto-advance interval in ms. Exposed for tests; defaults to 6000. */
  intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 4000;

export function Hero({
  config,
  carouselSlides,
  intervalMs = DEFAULT_INTERVAL_MS,
}: HeroProps) {
  const slides =
    carouselSlides && carouselSlides.length > 1 ? carouselSlides : null;
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!slides) return;
    const id = setInterval(() => {
      setActiveIndex(i => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides, intervalMs]);

  const fadeClass = prefersReducedMotion
    ? ''
    : 'transition-opacity duration-700';

  return (
    <section className='py-20 md:py-28'>
      <ContentContainer>
        <div className='grid md:grid-cols-2 gap-12 items-center'>
          <div>
            {config.eyebrow && (
              <p className='text-sm font-medium text-primary-600 dark:text-primary-400 mb-3'>
                {config.eyebrow}
              </p>
            )}
            <h1 className='text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-4'>
              {config.headline}
            </h1>

            {slides ? (
              // CSS grid stacking: all slides occupy the same cell so the tallest
              // one sets the container height — CTAs never jump when copy length varies.
              <div className='grid isolate' aria-live='polite'>
                {slides.map((slide, i) => (
                  <div
                    key={i}
                    style={{ gridArea: '1 / 1 / 2 / 2' }}
                    className={`${fadeClass} ${
                      i === activeIndex
                        ? 'opacity-100 z-10'
                        : 'opacity-0 z-0 pointer-events-none select-none'
                    }`}
                    aria-hidden={i !== activeIndex ? true : undefined}
                  >
                    {slide.label && (
                      <p className='text-lg font-semibold text-primary-600 dark:text-primary-400 mb-1'>
                        {slide.label}
                      </p>
                    )}
                    <p className='text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg'>
                      {slide.subhead}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg'>
                {config.subhead}
              </p>
            )}

            <div className='flex flex-wrap gap-3'>
              <Link
                to={config.primaryCta.href}
                className='inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors'
              >
                {config.primaryCta.label}
              </Link>
              {config.secondaryCta && (
                <a
                  href={config.secondaryCta.href}
                  className='inline-flex items-center px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  {config.secondaryCta.label}
                </a>
              )}
            </div>
            {config.trustStrip && (
              <p className='mt-6 text-sm text-gray-500 dark:text-gray-500'>
                {config.trustStrip}
              </p>
            )}
          </div>

          {/* aspect-video gives the container a stable size. All slide images are always
              mounted so CSS opacity transitions fire in both directions — true crossfade.
              Slide 0 uses eager/high-priority loading for LCP; others are lazy. */}
          <div className='rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg bg-gray-100 dark:bg-gray-900 aspect-video relative'>
            {slides ? (
              slides.map((slide, i) => {
                const isActive = i === activeIndex;
                return (
                  <img
                    key={i}
                    src={slide.mediaSrc}
                    alt={slide.mediaAlt}
                    aria-hidden={!isActive ? true : undefined}
                    className={`absolute inset-0 w-full h-full object-cover ${fadeClass} ${
                      isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    width={600}
                    height={338}
                    decoding='async'
                    {...(i === 0
                      ? ({
                          fetchpriority: 'high',
                        } as React.HTMLAttributes<HTMLImageElement>)
                      : {})}
                  />
                );
              })
            ) : (
              <img
                src={config.mediaSrc}
                alt={config.mediaAlt}
                className='absolute inset-0 w-full h-full object-cover'
                loading='eager'
                width={600}
                height={338}
                decoding='async'
                {...({
                  fetchpriority: 'high',
                } as React.HTMLAttributes<HTMLImageElement>)}
              />
            )}
          </div>
        </div>
      </ContentContainer>
    </section>
  );
}
