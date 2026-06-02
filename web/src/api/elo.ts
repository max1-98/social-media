/**
 * ELO ratings. Mirrors `GET /api/elo/elos/:username` (`EloListView`).
 */

import type { Elo } from "../types";

import { getJson } from "./http";

/** GET /api/elo/elos/:username — a user's rating rows. */
export async function elosForUser(username: string): Promise<Elo[]> {
  return getJson<Elo[]>(`/elo/elos/${encodeURIComponent(username)}`);
}
