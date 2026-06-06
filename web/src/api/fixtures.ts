/**
 * Club-vs-club fixtures and the club ELO ladder. Mirrors the fixture +
 * club-leaderboard routes in `server/src/routes.rs`. Every id crossing the wire
 * is an opaque string; this module never unpacks one.
 */

import type { ClubLadderEntry, Fixture, FixtureDetail, FixtureGame } from "../types";

import { getJson, postJson } from "./http";

/** Payload for `POST /api/club/:pk/fixtures` (propose a fixture). */
export interface ProposeFixturePayload {
  /** Opaque id of the away club. */
  away_club: string;
  /** Optional game-type name; the backend resolves it to an id. */
  game_type?: string;
  /** Optional ISO date for the fixture. */
  date?: string;
}

/** Payload for `POST /api/fixture/:id/games` (record one game's result). */
export interface RecordFixtureGamePayload {
  /** Opaque member ids on the home side. */
  home_team: string[];
  /** Opaque member ids on the away side. */
  away_team: string[];
  /** Score as `"s1,s2"`. */
  score: string;
}

/** POST /api/club/:pk/fixtures — propose a fixture against another club. */
export async function proposeFixture(
  clubId: string,
  body: ProposeFixturePayload,
): Promise<Fixture> {
  return postJson<Fixture>(`/club/${clubId}/fixtures`, body);
}

/** GET /api/club/:pk/fixtures — a club's fixtures (home or away). */
export async function listClubFixtures(clubId: string): Promise<Fixture[]> {
  return getJson<Fixture[]>(`/club/${clubId}/fixtures`);
}

/** GET /api/fixture/:id — full fixture detail (games + confirmations). */
export async function fixtureDetail(id: string): Promise<FixtureDetail> {
  return getJson<FixtureDetail>(`/fixture/${id}`);
}

/** POST /api/fixture/:id/accept — the away club accepts a proposed fixture. */
export async function acceptFixture(id: string): Promise<Fixture> {
  return postJson<Fixture>(`/fixture/${id}/accept`);
}

/** POST /api/fixture/:id/decline — the away club declines a proposed fixture. */
export async function declineFixture(id: string): Promise<Fixture> {
  return postJson<Fixture>(`/fixture/${id}/decline`);
}

/** POST /api/fixture/:id/cancel — either club cancels the fixture. */
export async function cancelFixture(id: string): Promise<Fixture> {
  return postJson<Fixture>(`/fixture/${id}/cancel`);
}

/** POST /api/fixture/:id/games — record one game's teams and score. */
export async function recordFixtureGame(
  id: string,
  body: RecordFixtureGamePayload,
): Promise<FixtureGame> {
  return postJson<FixtureGame>(`/fixture/${id}/games`, body);
}

/** POST /api/fixture/:id/confirm — confirm the recorded result (settles ELO). */
export async function confirmFixture(id: string): Promise<FixtureDetail> {
  return postJson<FixtureDetail>(`/fixture/${id}/confirm`);
}

/**
 * GET /api/leaderboards/clubs — the club ELO ladder, optionally scoped to a
 * game-type name. Returns entries ordered by the backend (highest ELO first).
 */
export async function clubLeaderboard(gameType?: string): Promise<ClubLadderEntry[]> {
  const query = gameType === undefined ? "" : `?game_type=${encodeURIComponent(gameType)}`;
  return getJson<ClubLadderEntry[]>(`/leaderboards/clubs${query}`);
}
