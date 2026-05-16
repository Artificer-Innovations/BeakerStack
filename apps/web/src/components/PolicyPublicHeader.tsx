import { Nav } from './landing/sections/Nav';
import { landingConfig } from '../config/landing';

/**
 * Marketing header for public/policy pages. Delegates to {@link Nav} so sticky
 * scroll behavior, mobile menu, nav links (Features / Pricing / FAQ), and auth
 * CTAs are identical to the home page.
 *
 * Hash anchors are prefixed with '/' so they navigate home-then-scroll when
 * followed from a policy URL (e.g. /terms → /#features).
 */
const publicNavConfig = {
  ...landingConfig.nav,
  links: landingConfig.nav.links.map(l => ({
    ...l,
    href: l.href.startsWith('#') ? `/${l.href}` : l.href,
  })),
  brand: landingConfig.brand,
};

export function PolicyPublicHeader() {
  return <Nav config={publicNavConfig} />;
}
