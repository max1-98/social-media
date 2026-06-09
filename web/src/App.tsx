import type { ReactElement, ReactNode } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { Spinner } from "./components/atoms";
import { Navbar } from "./components/organisms";
import { PageLayout } from "./components/templates";
import { AuthProvider, ConsentProvider } from "./contexts";
import { useAuth } from "./hooks";
import {
  AllClubsPage,
  ClubDetailPage,
  ClubEventsPage,
  ClubRankingsPage,
  ConsentBannerContainer,
  CookiePolicy,
  CreateClubPage,
  CreateEventPage,
  DiscoverClubsPage,
  EditClubPage,
  EventViewPage,
  FixturesPage,
  GameTypeElosPage,
  LoginPage,
  MyClubsPage,
  MyEventsPage,
  PastGamesPage,
  PrivacyPolicy,
  ProfilePage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "./pages";

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
 *
 * Public routes (auth + policies) render bare; every other screen renders under
 * `AuthedLayout` (guard + navbar shell).
 */
export default function App(): ReactElement {
  return (
    <ConsentProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Global, route-independent consent gate. */}
          <ConsentBannerContainer />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />

            {/* Authenticated (guard + navbar shell) */}
            <Route element={<AuthedLayout />}>
              <Route path="/" element={<AllClubsPage />} />
              <Route path="/clubs" element={<DiscoverClubsPage />} />
              <Route path="/club-rankings" element={<ClubRankingsPage />} />
              <Route path="/my-clubs" element={<MyClubsPage />} />
              <Route path="/createclub" element={<CreateClubPage />} />
              <Route path="/club/edit/:clubId" element={<EditClubPage />} />
              <Route path="/club/:clubId" element={<ClubDetailPage />} />
              <Route path="/club/:clubId/events" element={<ClubEventsPage />} />
              <Route path="/club/:clubId/fixtures" element={<FixturesPage />} />
              <Route path="/club/:clubId/event/create" element={<CreateEventPage />} />
              <Route path="/club/:clubId/event/:eventId" element={<EventViewPage />} />
              <Route path="/event/create" element={<CreateEventPage />} />
              <Route path="/events" element={<MyEventsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/games" element={<PastGamesPage />} />
              <Route path="/elos" element={<GameTypeElosPage />} />
              <Route path="/elos/:username" element={<GameTypeElosPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConsentProvider>
  );
}
