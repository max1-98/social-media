/**
 * `useAuth` — read the current auth state + actions from {@link AuthContext}.
 * Throws if used outside an `AuthProvider` so misuse fails loudly in dev.
 *
 * Boundaries: hooks may import `api`, `hooks`, `contexts`, `types` only.
 */

import { useContext } from "react";

import { AuthContext } from "../contexts";
import type { AuthContextValue } from "../contexts";

/** Access the auth context; must be rendered under an `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
