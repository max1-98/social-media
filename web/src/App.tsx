import type { ReactElement, ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Spinner } from "./components/atoms";
import { AuthProvider } from "./contexts";
import { useAuth } from "./hooks";
import { HomePage, LoginPage } from "./pages";

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
 * Application root: wires the auth provider and client-side routing. Feature
 * pages land in later streams; Stream 0 ships a guarded Home plus Login.
 */
export default function App(): ReactElement {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
