import { landingConfig } from '../../config/landing';
import { Nav } from './sections/Nav';
import { Hero } from './sections/Hero';
import { FeatureGrid } from './sections/FeatureGrid';
import { FeatureRows } from './sections/FeatureRows';
import { SocialProof } from './sections/SocialProof';
import { PricingSection } from './sections/PricingSection';
import { FAQ } from './sections/FAQ';
import { FinalCTA } from './sections/FinalCTA';

export function LandingPage() {
  const config = landingConfig;

  return (
    <div className='bg-white dark:bg-gray-950 min-h-screen'>
      <Nav config={{ ...config.nav, brand: config.brand }} />
      <main>
        <Hero config={config.hero} />
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
