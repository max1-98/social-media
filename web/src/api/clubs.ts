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
import { del, getJson, patchJson, postJson } from "./http";

export interface CreateClubPayload {
  name: string;
  club_username: string;
  sport_type: string;
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

/** GET /api/clubs — every active club (discover list). */
export async function allClubs(): Promise<ManyClub[]> {
  return getJson<ManyClub[]>("/clubs");
}

/** GET /api/clubs/:sport — clubs filtered by sport. */
export async function clubsBySport(sport: string): Promise<ManyClub[]> {
  return getJson<ManyClub[]>(`/clubs/${encodeURIComponent(sport)}`);
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

/** GET /api/clubs/:pk/socials — a club's social links. */
export async function clubSocials(pk: number | string): Promise<Social[]> {
  return getJson<Social[]>(`/clubs/${String(pk)}/socials`);
}

/** POST /api/club/edit/socials/:pk — replace a club's social links. */
export async function updateSocials(
  pk: number | string,
  socials: Social[],
): Promise<DetailResponse> {
  return postJson<DetailResponse>(`/club/edit/socials/${String(pk)}`, { socials });
}

/** POST /api/club/add-address — geocode + store a club's address. */
export async function addAddress(payload: AddressPayload): Promise<AddressResponse> {
  return postJson<AddressResponse>("/club/add-address", payload);
}
