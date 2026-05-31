import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { AdminRoute } from '@beakerstack/admin/web';
import { ProtectedRoute } from '@beakerstack/shared/components/auth/ProtectedRoute.web';
import { resolveAdopterRouteAuth } from '@beakerstack/shared/navigation/adopterExtensions';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { adopterRouteExtensions } from '@adopter/web/routeExtensions';
import { supabase } from './lib/supabase';
import { AppFooter } from './components/AppFooter';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';
import { LAYOUT } from './lib/layoutConstants';

const publicAdopterRouteExtensions = adopterRouteExtensions.filter(
  extension => resolveAdopterRouteAuth(extension.auth) === 'public'
);
const protectedAdopterRouteExtensions = adopterRouteExtensions.filter(
  extension => resolveAdopterRouteAuth(extension.auth) === 'protected'
);

function PageFallback() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600' />
    </div>
  );
}

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const SignupInvitePage = lazy(() => import('./pages/SignupInvitePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const AuthConfirmPage = lazy(() => import('./pages/AuthConfirmPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const ArticlesIndexPage = lazy(() => import('./pages/ArticlesIndexPage'));
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const ArticlesTagPage = lazy(() => import('./pages/ArticlesTagPage'));
const BillingOverviewPage = lazy(
  () => import('./pages/billing/BillingOverviewPage')
);
const BillingUsagePage = lazy(() => import('./pages/billing/BillingUsagePage'));
const BillingPlansPage = lazy(() => import('./pages/billing/BillingPlansPage'));
const BillingInvoicesPage = lazy(
  () => import('./pages/billing/BillingInvoicesPage')
);

const BillingProviderLayout = lazy(() =>
  import('./billing/BillingProviderLayout').then(m => ({
    default: m.BillingProviderLayout,
  }))
);

const AuthenticatedApp = lazy(() => import('./AuthenticatedApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const NotAuthorizedPage = lazy(() => import('./pages/NotAuthorizedPage'));

function RootLayout() {
  return (
    <div className={LAYOUT.shell}>
      <div className={LAYOUT.content}>
        <Outlet />
      </div>
      <AppFooter />
    </div>
  );
}

export function AdminRouteGate({ children }: { children: ReactNode }) {
  const auth = useAuthContext();
  return (
    <AdminRoute
      supabase={supabase}
      userId={auth.user?.id}
      authLoading={auth.loading}
    >
      {children}
    </AdminRoute>
  );
}

export function AdopterRoute({
  extension,
}: {
  extension: (typeof adopterRouteExtensions)[number];
}) {
  const auth = resolveAdopterRouteAuth(extension.auth);
  if (auth === 'public') {
    return <>{extension.element}</>;
  }
  return <ProtectedRoute>{extension.element}</ProtectedRoute>;
}

function App() {
  return (
    <div className={LAYOUT.outer}>
      <AppErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path='/' element={<HomePage />} />
              <Route path='/terms' element={<PolicyPage policy='terms' />} />
              <Route
                path='/privacy'
                element={<PolicyPage policy='privacy' />}
              />
              <Route
                path='/refunds'
                element={<PolicyPage policy='refunds' />}
              />
              <Route path='/help' element={<HelpPage />} />
              <Route path='/articles' element={<ArticlesIndexPage />} />
              <Route path='/articles/tags/:tag' element={<ArticlesTagPage />} />
              <Route path='/articles/:slug' element={<ArticlePage />} />
            </Route>

            <Route
              element={
                <Suspense fallback={<PageFallback />}>
                  <AuthenticatedApp />
                </Suspense>
              }
            >
              <Route
                path='/admin/*'
                element={
                  <AdminRouteGate>
                    <Suspense fallback={<PageFallback />}>
                      <AdminApp />
                    </Suspense>
                  </AdminRouteGate>
                }
              />
              <Route element={<RootLayout />}>
                <Route path='/login' element={<LoginPage />} />
                <Route path='/signup' element={<SignupPage />} />
                <Route path='/signup/invite' element={<SignupInvitePage />} />
                <Route
                  path='/forgot-password'
                  element={<ForgotPasswordPage />}
                />
                <Route path='/reset-password' element={<ResetPasswordPage />} />
                <Route path='/auth/callback' element={<AuthCallbackPage />} />
                <Route path='/auth/confirm' element={<AuthConfirmPage />} />
                <Route
                  path='/not-authorized'
                  element={
                    <ProtectedRoute redirectTo='/login'>
                      <NotAuthorizedPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/profile'
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                {publicAdopterRouteExtensions.map(extension => (
                  <Route
                    key={extension.path}
                    path={extension.path}
                    element={extension.element}
                  />
                ))}
                <Route
                  element={
                    <ProtectedRoute>
                      <Outlet />
                    </ProtectedRoute>
                  }
                >
                  <Route
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <BillingProviderLayout />
                      </Suspense>
                    }
                  >
                    {protectedAdopterRouteExtensions.map(extension => (
                      <Route
                        key={extension.path}
                        path={extension.path}
                        element={extension.element}
                      />
                    ))}
                    <Route path='/billing' element={<BillingOverviewPage />} />
                    <Route
                      path='/billing/usage'
                      element={<BillingUsagePage />}
                    />
                    <Route
                      path='/billing/plans'
                      element={<BillingPlansPage />}
                    />
                    <Route
                      path='/billing/invoices'
                      element={<BillingInvoicesPage />}
                    />
                  </Route>
                </Route>
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </div>
  );
}

export default App;
