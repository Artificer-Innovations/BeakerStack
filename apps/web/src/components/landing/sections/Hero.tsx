import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { LandingConfig } from '../../../config/landing';

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

const DEFAULT_INTERVAL_MS = 6000;

export function Hero({ config, carouselSlides, intervalMs = DEFAULT_INTERVAL_MS }: HeroProps) {
  const slides = carouselSlides && carouselSlides.length > 1 ? carouselSlides : null;
  const [activeIndex, setActiveIndex] = useState(0);
  // prevIndex tracks the outgoing slide so its image stays mounted during the crossfade.
  // Only the active and previous images are in the DOM at any time, preventing browsers
  // from fetching all slide images on initial load (opacity/aria-hidden don't suppress fetches).
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!slides) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      const current = activeIndexRef.current;
      setPrevIndex(current);
      setActiveIndex((current + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides, intervalMs]);

  return (
    <section className='py-20 md:py-28'>
      <div className='max-w-[1200px] mx-auto px-6'>
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
              <div className='grid' aria-live='polite'>
                {slides.map((slide, i) => (
                  <div
                    key={i}
                    style={{ gridArea: '1 / 1 / 2 / 2' }}
                    className={`transition-opacity duration-700 ${
                      i === activeIndex
                        ? 'opacity-100'
                        : 'opacity-0 pointer-events-none select-none'
                    }`}
                    aria-hidden={i !== activeIndex ? true : undefined}
                  >
                    {slide.label && (
                      <p className='text-sm font-semibold text-primary-600 dark:text-primary-400 mb-1'>
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

          {/* aspect-video gives the container a stable size. Only the active and previous
              slide images are mounted — this prevents all images being fetched on load. */}
          <div className='rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg bg-gray-100 dark:bg-gray-900 aspect-video relative'>
            {slides ? (
              slides.map((slide, i) => {
                const isActive = i === activeIndex;
                const isPrev = i === prevIndex;
                if (!isActive && !isPrev) return null;
                return (
                  <img
                    key={i}
                    src={slide.mediaSrc}
                    alt={slide.mediaAlt}
                    aria-hidden={!isActive ? true : undefined}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    width={600}
                    height={338}
                    decoding='async'
                    {...(i === 0 ? ({ fetchPriority: 'high' } as object) : {})}
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
                {...({ fetchPriority: 'high' } as object)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
