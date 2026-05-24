import type { ComponentType, ReactNode } from 'react';

export type AdopterRouteAuth = 'public' | 'protected';

export type AdopterRouteExtension = {
  path: string;
  element: ReactNode;
  auth?: AdopterRouteAuth;
};

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
