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
  club_id: string;
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
export async function clubDetail(pk: string): Promise<Club> {
  return getJson<Club>(`/club/${pk}`);
}

/** DELETE /api/club/:pk — delete a club (president only). */
export async function deleteClub(pk: string): Promise<DetailResponse> {
  return del<DetailResponse>(`/club/${pk}`);
}

/** POST /api/createclub — create a club. */
export async function createClub(payload: CreateClubPayload): Promise<Club> {
  return postJson<Club>("/createclub", payload);
}

/** PATCH /api/club/edit/:pk — edit a club's profile. */
export async function editClub(pk: string, payload: EditClubPayload): Promise<Club> {
  return patchJson<Club>(`/club/edit/${pk}`, payload);
}

/** POST /api/club/request/create — request to join a club. */
export async function createRequest(clubId: string): Promise<DetailResponse> {
  return postJson<DetailResponse>("/club/request/create", { club_id: clubId });
}

/** POST /api/club/request/cancel — cancel a pending join request. */
export async function cancelRequest(clubId: string): Promise<DetailResponse> {
  return postJson<DetailResponse>("/club/request/cancel", { club_id: clubId });
}

/** GET /api/club/requests/:pk — pending join requests for a club. */
export async function clubRequests(pk: string): Promise<MemberRequest[]> {
  return getJson<MemberRequest[]>(`/club/requests/${pk}`);
}

/** GET /api/club/members/:pk — a club's members. */
export async function clubMembers(pk: string): Promise<Member[]> {
  return getJson<Member[]>(`/club/members/${pk}`);
}

/** GET /api/club/members/event/:pk1 — members with their event ELO. */
export async function clubMembersForEvent(pk1: string): Promise<MemberEvent[]> {
  return getJson<MemberEvent[]>(`/club/members/event/${pk1}`);
}

/** GET /api/club/request-accept/:clubPk/:requestPk — accept a join request. */
export async function acceptRequest(clubPk: string, requestPk: string): Promise<DetailResponse> {
  return getJson<DetailResponse>(`/club/request-accept/${clubPk}/${requestPk}`);
}

/** DELETE /api/club/request-accept/:clubPk/:requestPk — reject a join request. */
export async function rejectRequest(clubPk: string, requestPk: string): Promise<DetailResponse> {
  return del<DetailResponse>(`/club/request-accept/${clubPk}/${requestPk}`);
}

/** DELETE /api/club/member/:clubPk/:memberPk — remove a member (admin). */
export async function removeMember(clubPk: string, memberPk: string): Promise<DetailResponse> {
  return del<DetailResponse>(`/club/member/${clubPk}/${memberPk}`);
}

/** DELETE /api/club/member/:pk — leave a club. */
export async function leaveClub(pk: string): Promise<DetailResponse> {
  return del<DetailResponse>(`/club/member/${pk}`);
}

/** GET /api/club/make-admin/:clubPk/:memberPk — promote a member to admin. */
export async function promoteMember(clubPk: string, memberPk: string): Promise<DetailResponse> {
  return getJson<DetailResponse>(`/club/make-admin/${clubPk}/${memberPk}`);
}

/** DELETE /api/club/make-admin/:clubPk/:memberPk — demote an admin. */
export async function demoteMember(clubPk: string, memberPk: string): Promise<DetailResponse> {
  return del<DetailResponse>(`/club/make-admin/${clubPk}/${memberPk}`);
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
  club_id: string;
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

/** GET /api/clubs/:pk/socials — a club's social links. */
export async function clubSocials(pk: string): Promise<Social[]> {
  return getJson<Social[]>(`/clubs/${pk}/socials`);
}

/**
 * PATCH /api/club/:pk/logo — upload a club logo (admin only). Sends the file as
 * multipart under the `logo` field, matching the Rust `upload_logo` handler.
 */
export async function uploadLogo(pk: string, file: File): Promise<MessageResponse> {
  const form = new FormData();
  form.append("logo", file);
  return patchForm<MessageResponse>(`/club/${pk}/logo`, form);
}

/**
 * POST /api/club/edit/socials/:pk — set/clear a club's social links. The Rust
 * `update_socials` handler reads flat per-platform fields (`facebook`,
 * `instagram`, `whatsapp`, `website`); an empty string clears that platform.
 */
export async function updateSocials(
  pk: string,
  links: SocialLinksPayload,
): Promise<DetailResponse> {
  return postJson<DetailResponse>(`/club/edit/socials/${pk}`, links);
}

/** POST /api/club/add-address — geocode + store a club's address. */
export async function addAddress(payload: AddressPayload): Promise<AddressResponse> {
  return postJson<AddressResponse>("/club/add-address", payload);
}
