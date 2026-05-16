import { Nav } from './landing/sections/Nav';
import { landingConfig } from '../config/landing';
import { getPrPreviewAssetBasePath } from '../lib/prPreviewAssetBasePath';

/**
 * Marketing header for public/policy pages. Delegates to {@link Nav} so sticky
 * scroll behavior, mobile menu, nav links (Features / Pricing / FAQ), and auth
 * CTAs are identical to the home page.
 *
 * Hash anchors are prefixed with the app base path so they work on PR preview
 * deployments (e.g. /pr-123/#features) as well as production (/#features).
 */
export function PolicyPublicHeader() {
  const basePath = getPrPreviewAssetBasePath();
  const publicNavConfig = {
    ...landingConfig.nav,
    links: landingConfig.nav.links.map(l => ({
      ...l,
      href: l.href.startsWith('#') ? `${basePath}${l.href}` : l.href,
    })),
    brand: landingConfig.brand,
  };
  return <Nav config={publicNavConfig} />;
}
