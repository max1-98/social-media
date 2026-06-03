/**
 * Events resource. Mirrors the event routes in `server/src/routes.rs`
 * (list/detail, create, member activation, lifecycle, settings, stats).
 */

import type { Event, EventDetail, EventStatsResult } from "../types";

import type { DetailResponse } from "./auth";
import { getJson, patchJson, postJson } from "./http";

export interface CreateEventPayload {
  date: string;
  start_time: string;
  finish_time: string;
  number_of_courts: number;
  sbmm: boolean;
  guests_allowed: boolean;
  over_18_under_18_mixed: string;
  game_type: string;
}

export interface EventSettingsPayload {
  number_of_courts?: number;
  sbmm?: boolean;
  guests_allowed?: boolean;
  over_18_under_18_mixed?: string;
}

/**
 * The five leaderboards returned by `/stats` (best winstreak, highest win rate,
 * most wins, most games played, highest ELO gain). Shape per the
 * `EventStatsSerializer` parity test in `server/src/domain/events.rs`.
 */
export type EventStats = EventStatsResult;

/** GET /api/events — the caller's events. */
export async function myEvents(): Promise<Event[]> {
  return getJson<Event[]>("/events");
}

/** GET /api/events/:pk — a club's events. */
export async function clubEvents(pk: string): Promise<Event[]> {
  return getJson<Event[]>(`/events/${pk}`);
}

/** GET /api/event/:pk — a single event's detail. */
export async function eventDetail(pk: string): Promise<EventDetail> {
  return getJson<EventDetail>(`/event/${pk}`);
}

/** POST /api/event/create/:pk — create an event under a club. */
export async function createEvent(
  clubPk: string,
  payload: CreateEventPayload,
): Promise<EventDetail> {
  return postJson<EventDetail>(`/event/create/${clubPk}`, payload);
}

/** POST /api/event/activate-member — mark a member active for an event. */
export async function activateMember(eventId: string, memberId: string): Promise<DetailResponse> {
  return postJson<DetailResponse>("/event/activate-member", {
    event_id: eventId,
    member_id: memberId,
  });
}

/** POST /api/event/deactivate-member — mark a member inactive for an event. */
export async function deactivateMember(eventId: string, memberId: string): Promise<DetailResponse> {
  return postJson<DetailResponse>("/event/deactivate-member", {
    event_id: eventId,
    member_id: memberId,
  });
}

/** POST /api/event/start — begin an event. */
export async function startEvent(eventId: string): Promise<DetailResponse> {
  return postJson<DetailResponse>("/event/start", { event_id: eventId });
}

/** POST /api/event/complete — finish an event. */
export async function completeEvent(eventId: string): Promise<DetailResponse> {
  return postJson<DetailResponse>("/event/complete", { event_id: eventId });
}

/** PATCH /api/event/settings/:pk — update event settings. */
export async function updateSettings(
  pk: string,
  payload: EventSettingsPayload,
): Promise<EventDetail> {
  return patchJson<EventDetail>(`/event/settings/${pk}`, payload);
}

/** GET /api/event/:pk/stats — per-member attendance stats. */
export async function eventStats(pk: string): Promise<EventStats> {
  return getJson<EventStats>(`/event/${pk}/stats`);
}
