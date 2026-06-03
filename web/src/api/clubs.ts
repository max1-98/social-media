/**
 * Clubs resource. Mirrors the club routes in `server/src/routes.rs` (reads,
 * lifecycle, member requests/membership, sports, socials, logo, geocoded address).
 */

import type {
  Club,
  Coordinates,
  ManyClub,
  Member,
  MemberEvent,
  MemberRequest,
  MyClub,
  Social,
  Sport,
} from "../types";

import type { DetailResponse } from "./auth";
import { del, getJson, patchForm, patchJson, postJson } from "./http";

export interface CreateClubPayload {
  name: string;
  club_username: string;
  info?: string;
}

export interface EditClubPayload {
  name?: string;
  info?: string;
}

/** Response of `POST /api/club/add-address`: the geocoded result for a club. */
export interface AddressResponse {
  lat_lng: Coordinates;
  address: string;
  formatted_address: string;
}

export interface AddressPayload {
  club_id: number;
  address: string;
}

/**
 * Geographic bounds to scope a club listing to the visible map area. Matches the
 * Rust `ClubBounds` query params; all four must be present to take effect.
 */
export interface ClubBounds {
  southwest_lat: number;
  southwest_lng: number;
  northeast_lat: number;
  northeast_lng: number;
}

function boundsQuery(bounds?: ClubBounds): string {
  if (bounds === undefined) return "";
  const params = new URLSearchParams({
    southwest_lat: String(bounds.southwest_lat),
    southwest_lng: String(bounds.southwest_lng),
    northeast_lat: String(bounds.northeast_lat),
    northeast_lng: String(bounds.northeast_lng),
  });
  return `?${params.toString()}`;
}

/** GET /api/clubs — every active club (discover list), optionally scoped to bounds. */
export async function allClubs(bounds?: ClubBounds): Promise<ManyClub[]> {
  return getJson<ManyClub[]>(`/clubs${boundsQuery(bounds)}`);
}

/** GET /api/clubs/:sport — clubs filtered by sport, optionally scoped to bounds. */
export async function clubsBySport(sport: string, bounds?: ClubBounds): Promise<ManyClub[]> {
  return getJson<ManyClub[]>(`/clubs/${encodeURIComponent(sport)}${boundsQuery(bounds)}`);
}

/** GET /api/club/my-clubs — the caller's club memberships. */
export async function myClubs(): Promise<MyClub[]> {
  return getJson<MyClub[]>("/club/my-clubs");
}

/** GET /api/club/:pk — a single club's detail. */
export async function clubDetail(pk: number | string): Promise<Club> {
  return getJson<Club>(`/club/${String(pk)}`);
}

/** DELETE /api/club/:pk — delete a club (president only). */
export async function deleteClub(pk: number | string): Promise<DetailResponse> {
  return del<DetailResponse>(`/club/${String(pk)}`);
}

/** POST /api/createclub — create a club. */
export async function createClub(payload: CreateClubPayload): Promise<Club> {
  return postJson<Club>("/createclub", payload);
}

/** PATCH /api/club/edit/:pk — edit a club's profile. */
export async function editClub(pk: number | string, payload: EditClubPayload): Promise<Club> {
  return patchJson<Club>(`/club/edit/${String(pk)}`, payload);
}

/** POST /api/club/request/create — request to join a club. */
export async function createRequest(clubId: number): Promise<DetailResponse> {
  return postJson<DetailResponse>("/club/request/create", { club_id: clubId });
}

/** POST /api/club/request/cancel — cancel a pending join request. */
export async function cancelRequest(clubId: number): Promise<DetailResponse> {
  return postJson<DetailResponse>("/club/request/cancel", { club_id: clubId });
}

/** GET /api/club/requests/:pk — pending join requests for a club. */
export async function clubRequests(pk: number | string): Promise<MemberRequest[]> {
  return getJson<MemberRequest[]>(`/club/requests/${String(pk)}`);
}

/** GET /api/club/members/:pk — a club's members. */
export async function clubMembers(pk: number | string): Promise<Member[]> {
  return getJson<Member[]>(`/club/members/${String(pk)}`);
}

/** GET /api/club/members/event/:pk1 — members with their event ELO. */
export async function clubMembersForEvent(pk1: number | string): Promise<MemberEvent[]> {
  return getJson<MemberEvent[]>(`/club/members/event/${String(pk1)}`);
}

/** GET /api/club/request-accept/:clubPk/:requestPk — accept a join request. */
export async function acceptRequest(
  clubPk: number | string,
  requestPk: number | string,
): Promise<DetailResponse> {
  return getJson<DetailResponse>(`/club/request-accept/${String(clubPk)}/${String(requestPk)}`);
}

/** DELETE /api/club/request-accept/:clubPk/:requestPk — reject a join request. */
export async function rejectRequest(
  clubPk: number | string,
  requestPk: number | string,
): Promise<DetailResponse> {
  return del<DetailResponse>(`/club/request-accept/${String(clubPk)}/${String(requestPk)}`);
}

/** DELETE /api/club/member/:clubPk/:memberPk — remove a member (admin). */
export async function removeMember(
  clubPk: number | string,
  memberPk: number | string,
): Promise<DetailResponse> {
  return del<DetailResponse>(`/club/member/${String(clubPk)}/${String(memberPk)}`);
}

/** DELETE /api/club/member/:pk — leave a club. */
export async function leaveClub(pk: number | string): Promise<DetailResponse> {
  return del<DetailResponse>(`/club/member/${String(pk)}`);
}

/** GET /api/club/make-admin/:clubPk/:memberPk — promote a member to admin. */
export async function promoteMember(
  clubPk: number | string,
  memberPk: number | string,
): Promise<DetailResponse> {
  return getJson<DetailResponse>(`/club/make-admin/${String(clubPk)}/${String(memberPk)}`);
}

/** DELETE /api/club/make-admin/:clubPk/:memberPk — demote an admin. */
export async function demoteMember(
  clubPk: number | string,
  memberPk: number | string,
): Promise<DetailResponse> {
  return del<DetailResponse>(`/club/make-admin/${String(clubPk)}/${String(memberPk)}`);
}

/** GET /api/club/add-sport — the list of selectable sports. */
export async function listSports(): Promise<Sport[]> {
  return getJson<Sport[]>("/club/add-sport");
}

/** Message envelope returned by some club mutations (`{ message }`). */
export interface MessageResponse {
  message: string;
}

/** Payload for `POST /api/club/add-sport`. */
export interface AddSportPayload {
  club_id: number;
  sport_name: string;
}

/**
 * The four social platforms the backend recognises. Each value is set/cleared
 * independently; an empty string clears that platform.
 */
export interface SocialLinksPayload {
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  website?: string;
}

/** POST /api/club/add-sport — set a club's sport type. */
export async function addSport(payload: AddSportPayload): Promise<MessageResponse> {
  return postJson<MessageResponse>("/club/add-sport", payload);
}

/**
 * GET /api/clubs/:pk/socials — a club's social links. The backend wraps the list
 * in `{ socials: [...] }` (`ClubSocialSerializer`); unwrap to the bare array so
 * callers get the declared `Social[]`.
 */
export async function clubSocials(pk: number | string): Promise<Social[]> {
  const body = await getJson<{ socials: Social[] }>(`/clubs/${String(pk)}/socials`);
  return body.socials;
}

/**
 * PATCH /api/club/:pk/logo — upload a club logo (admin only). Sends the file as
 * multipart under the `logo` field, matching the Rust `upload_logo` handler.
 */
export async function uploadLogo(pk: number | string, file: File): Promise<MessageResponse> {
  const form = new FormData();
  form.append("logo", file);
  return patchForm<MessageResponse>(`/club/${String(pk)}/logo`, form);
}

/**
 * DELETE /api/club/:pk/logo — remove a club logo (admin only), clearing the
 * stored file and the column, matching the Rust `remove_logo` handler.
 */
export async function removeLogo(pk: number | string): Promise<MessageResponse> {
  return del<MessageResponse>(`/club/${String(pk)}/logo`);
}

/**
 * POST /api/club/edit/socials/:pk — set/clear a club's social links. The Rust
 * `update_socials` handler reads flat per-platform fields (`facebook`,
 * `instagram`, `whatsapp`, `website`); an empty string clears that platform.
 */
export async function updateSocials(
  pk: number | string,
  links: SocialLinksPayload,
): Promise<DetailResponse> {
  return postJson<DetailResponse>(`/club/edit/socials/${String(pk)}`, links);
}

/** POST /api/club/add-address — geocode + store a club's address. */
export async function addAddress(payload: AddressPayload): Promise<AddressResponse> {
  return postJson<AddressResponse>("/club/add-address", payload);
}
