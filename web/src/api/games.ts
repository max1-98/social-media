/**
 * Games resource. Mirrors the `/game/*` routes in `server/src/routes.rs`
 * (matchmaking creation, completion/deletion, listing per event and per user).
 */

import type { CompleteGame, Game } from "../types";

import type { DetailResponse } from "./auth";
import { getJson, postJson } from "./http";

export interface CompleteGamePayload {
  game_id: string;
  event_id: string;
  score: string;
}

/** POST /api/game/create-sbmm — create a skill-based matchmaking game. */
export async function createSbmm(eventId: string): Promise<Game> {
  return postJson<Game>("/game/create-sbmm", { event_id: eventId });
}

/** POST /api/game/create-social — create a social (non-ranked) game. */
export async function createSocial(eventId: string): Promise<Game> {
  return postJson<Game>("/game/create-social", { event_id: eventId });
}

/** POST /api/game/create-peg — create a peg (manual) game. */
export async function createPeg(eventId: string, memberIds: string[]): Promise<Game> {
  return postJson<Game>("/game/create-peg", { event_id: eventId, member_ids: memberIds });
}

/** POST /api/game/delete — delete an in-progress game. */
export async function deleteGame(gameId: string): Promise<DetailResponse> {
  return postJson<DetailResponse>("/game/delete", { game_id: gameId });
}

/** POST /api/game/complete — record a game's score (updates ELO). */
export async function completeGame(payload: CompleteGamePayload): Promise<DetailResponse> {
  return postJson<DetailResponse>("/game/complete", payload);
}

/** GET /api/game/games/:pk — an event's in-progress games. */
export async function eventIncompleteGames(pk: string): Promise<Game[]> {
  return getJson<Game[]>(`/game/games/${pk}`);
}

/** GET /api/game/event/games/:pk — an event's completed games. */
export async function eventCompleteGames(pk: string): Promise<CompleteGame[]> {
  return getJson<CompleteGame[]>(`/game/event/games/${pk}`);
}

/** GET /api/game/users/games — the caller's completed games. */
export async function userGames(): Promise<CompleteGame[]> {
  return getJson<CompleteGame[]>("/game/users/games");
}
