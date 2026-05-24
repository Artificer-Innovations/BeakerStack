import { Suspense, lazy, useMemo } from 'react';
import { landingConfig } from '@adopter/config/landing';
import { Nav } from './sections/Nav';
import { Hero, buildCarouselSlides } from './sections/Hero';
import { FeatureGrid } from './sections/FeatureGrid';
import { FeatureRows } from './sections/FeatureRows';

const SocialProof = lazy(() =>
  import('./sections/SocialProof').then(m => ({ default: m.SocialProof }))
);
const PricingSection = lazy(() =>
  import('./sections/PricingSection').then(m => ({
    default: m.PricingSection,
  }))
);
const FAQ = lazy(() =>
  import('./sections/FAQ').then(m => ({ default: m.FAQ }))
);
const FinalCTA = lazy(() =>
  import('./sections/FinalCTA').then(m => ({ default: m.FinalCTA }))
);

export function LandingPage() {
  const config = landingConfig;
  const carouselSlides = useMemo(() => buildCarouselSlides(config), [config]);

  return (
    <div className='bg-white dark:bg-gray-950 min-h-screen'>
      <Nav config={{ ...config.nav, brand: config.brand }} />
      <main>
        <Hero config={config.hero} carouselSlides={carouselSlides} />
        <FeatureGrid config={config.featureGrid} />
        <FeatureRows config={config.featureRows} />
        <Suspense fallback={null}>
          <SocialProof config={config.socialProof} />
          <PricingSection config={config.pricing} />
          <FAQ config={config.faq} />
          <FinalCTA config={config.finalCta} />
        </Suspense>
      </main>
    </div>
  );
}
