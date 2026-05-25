# Extension slot types

Public API in `@beakerstack/shared/navigation/adopterExtensions`.

## Types

```ts
export type AdopterRouteAuth = 'public' | 'protected';

export type AdopterRouteExtension = {
  path: string;
  element: React.ReactNode;
  auth?: AdopterRouteAuth; // default: 'protected'
};

export type AdopterScreenExtension = {
  name: string;
  component: React.ComponentType;
  auth?: AdopterRouteAuth; // default: 'protected'
};
```

## Web vs mobile asymmetry (intentional)

| Platform | Field       | Type                  | Why                                                                       |
| -------- | ----------- | --------------------- | ------------------------------------------------------------------------- |
| Web      | `element`   | `React.ReactNode`     | React Router v6 `<Route element={...} />` expects a rendered node         |
| Mobile   | `component` | `React.ComponentType` | React Navigation `<Stack.Screen component={...} />` expects a constructor |

Web routes in `adopter/web/routeExtensions.tsx` use JSX — evaluated at module load (before Router context). This is intentional.

## Code splitting (web)

Adopters who want lazy routes wrap at the definition site:

```tsx
const LazyDashboard = React.lazy(() => import('./pages/DashboardPage'));

export const adopterRouteExtensions: AdopterRouteExtension[] = [
  {
    path: '/dashboard',
    auth: 'protected',
    element: (
      <Suspense fallback={<PageFallback />}>
        <LazyDashboard />
      </Suspense>
    ),
  },
];
```

## Template wiring

- `App.tsx` wraps `auth: 'protected'` routes in `ProtectedRoute`; public routes render bare.
- `AppNavigator.tsx` registers adopter screens from `adopter/mobile/screenExtensions.tsx`.
- Template owns `RootStackParamList` and base navigator structure.

## Import seams

Only these template files may import `@adopter/*`:

- `apps/web/src/main.tsx` → `@adopter/config`
- `apps/web/scripts/prerender-home.ts` → `@adopter/config`
- `apps/web/src/App.tsx` → `@adopter/web/routeExtensions`
- `apps/mobile/src/navigation/AppNavigator.tsx` → `@adopter/mobile/screenExtensions`
