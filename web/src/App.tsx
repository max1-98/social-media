import type { ReactElement, ReactNode } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { Spinner } from "./components/atoms";
import { Navbar } from "./components/organisms";
import { PageLayout } from "./components/templates";
import { AuthProvider, ConsentProvider } from "./contexts";
import { useAuth } from "./hooks";
import { ConsentBannerContainer, CookiePolicy, HomePage, LoginPage, PrivacyPolicy } from "./pages";

/**
 * Route guard: renders children only for an authenticated user; otherwise
 * redirects to `/login`. While the initial `/auth/me` hydration is in flight it
 * shows a spinner so we never flash the login screen for a logged-in user.
 */
function RequireAuth({ children }: { children: ReactNode }): ReactElement {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * Authenticated app shell: wires `useAuth` into the presentational `Navbar`
 * (organisms cannot import hooks) and renders the routed page in `PageLayout`.
 * App.tsx is the composition layer, so it may cross every boundary here.
 */
function AuthedLayout(): ReactElement {
  const { user, logout } = useAuth();
  return (
    <RequireAuth>
      <PageLayout
        navbar={
          <Navbar
            user={user}
            onLogout={() => {
              void logout();
            }}
          />
        }
      >
        <Outlet />
      </PageLayout>
    </RequireAuth>
  );
}

/**
 * Application root: wires the consent + auth providers and client-side routing.
 * The consent banner renders globally (above every route) so the GDPR gate
 * applies before login too; ads never load until consent is accepted.
 */
export default function App(): ReactElement {
  return (
    <ConsentProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Global, route-independent consent gate. */}
          <ConsentBannerContainer />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route element={<AuthedLayout />}>
              <Route path="/" element={<HomePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConsentProvider>
  );
}
