import { branding } from './branding';

export interface LandingSeo {
  title: string;
  description: string;
  ogImage: string;
}

/** Social / HTML meta. Safe to import from Node build scripts (no Vite env). */
export const landingSeo: LandingSeo = {
  title: `${branding.displayName} — Ship your SaaS faster`,
  description:
    'Beaker Stack gives you auth, billing, and a cross-platform React foundation — ready to ship your SaaS.',
  ogImage: '/og-image.png',
};
