/**
 * Authentication context. Holds the current user and the login/logout/refresh
 * actions, hydrating from `GET /api/auth/me` on mount. Auth is httpOnly-cookie
 * based, so there is no token in state — only the user profile (or `null`).
 *
 * Boundaries: contexts may import `api`, `hooks`, `contexts`, `types` only.
 */

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { authApi } from "../api";
import type { LoginPayload } from "../api";
import type { User } from "../types";

/** The shape consumers read via `useAuth`. */
export interface AuthContextValue {
  /** The signed-in user, or `null` when anonymous. */
  user: User | null;
  /** True until the initial `/auth/me` hydration resolves. */
  loading: boolean;
  /** Sign in, then hydrate the full profile. Throws `ApiRequestError` on failure. */
  login: (payload: LoginPayload) => Promise<void>;
  /** Sign out and clear local state. */
  logout: () => Promise<void>;
  /** Re-fetch `/auth/me`; returns the user or `null` if unauthenticated. */
  refresh: () => Promise<User | null>;
}

/** Internal context object; consume it through the `useAuth` hook. */
export const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

/** Provides auth state + actions to the tree. */
export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async (): Promise<User | null> => {
    try {
      const me = await authApi.me();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const login = useCallback(
    async (payload: LoginPayload): Promise<void> => {
      await authApi.login(payload);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => {
      setLoading(false);
    });
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
