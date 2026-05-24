import type { ComponentType, ReactNode } from 'react';

export type AdopterRouteAuth = 'public' | 'protected';

/**
 * Web route extension. Uses a pre-rendered ReactNode (not ComponentType) so the
 * adopter registry can attach Suspense/fallback wrappers at module scope before
 * React Router renders the route.
 */
export type AdopterRouteExtension = {
  path: string;
  element: ReactNode;
  auth?: AdopterRouteAuth;
};

/**
 * Mobile screen extension. Uses ComponentType because React Navigation mounts
 * screens lazily from constructors and handles its own loading boundaries.
 */
export type AdopterScreenExtension = {
  name: string;
  component: ComponentType;
  auth?: AdopterRouteAuth;
};

export function resolveAdopterRouteAuth(
  auth: AdopterRouteAuth | undefined
): AdopterRouteAuth {
  return auth ?? 'protected';
}
