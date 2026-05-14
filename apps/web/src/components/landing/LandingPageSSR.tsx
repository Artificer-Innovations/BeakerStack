import { landingConfig } from '../../config/landing';
import { Nav } from './sections/Nav';
import { Hero } from './sections/Hero';
import type { CarouselSlide } from './sections/Hero';
import { FeatureGrid } from './sections/FeatureGrid';
import { FeatureRows } from './sections/FeatureRows';
import { SocialProof } from './sections/SocialProof';
import { PricingSection } from './sections/PricingSection';
import { FAQ } from './sections/FAQ';
import { FinalCTA } from './sections/FinalCTA';

// Eagerly imports all sections for use by the prerender script (renderToString).
// LandingPage uses React.lazy() for below-fold sections, which resolve as empty
// Suspense fallbacks under synchronous renderToString — use this file instead.
export function LandingPageSSR() {
  const config = landingConfig;

  const carouselSlides: CarouselSlide[] = [
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

  return (
    <div className='bg-white dark:bg-gray-950 min-h-screen'>
      <Nav config={{ ...config.nav, brand: config.brand }} />
      <main>
        <Hero config={config.hero} carouselSlides={carouselSlides} />
        <FeatureGrid config={config.featureGrid} />
        <FeatureRows config={config.featureRows} />
        <SocialProof config={config.socialProof} />
        <PricingSection config={config.pricing} />
        <FAQ config={config.faq} />
        <FinalCTA config={config.finalCta} />
      </main>
    </div>
  );
}
