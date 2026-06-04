/**
 * Auth resource: register / login / logout / refresh / me + email-verify and
 * password-reset. Mirrors `server/src/domain/auth.rs` handlers under `/auth`.
 * Auth is httpOnly-cookie based — these calls never see or store a token.
 */

import type { AuthUser, NavbarUser, SimpleUser, User } from "../types";

import { getJson, patchJson, postJson } from "./http";

/** `{ user: { id, username } }` returned by login/refresh. */
export interface AuthUserResponse {
  user: AuthUser;
}

/** Generic `{ detail }` acknowledgement returned by several handlers. */
export interface DetailResponse {
  detail: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  surname?: string;
  date_of_birth: string;
  biological_gender?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface ResetPasswordPayload {
  password1: string;
  password2: string;
  password_token: string;
}

/** PATCH /api/auth/me body — rectify a subset of the profile (GDPR Art. 16). */
export interface UpdateProfilePayload {
  first_name?: string;
  surname?: string;
  biological_gender?: string;
}

/** POST /api/auth/register — create an account (age-gated server-side). */
export async function register(payload: RegisterPayload): Promise<User> {
  return postJson<User>("/auth/register", payload);
}

/** POST /api/auth/login — set the httpOnly session cookies. */
export async function login(payload: LoginPayload): Promise<AuthUserResponse> {
  return postJson<AuthUserResponse>("/auth/login", payload);
}

/** POST /api/auth/logout — clear the session cookies. */
export async function logout(): Promise<DetailResponse> {
  return postJson<DetailResponse>("/auth/logout");
}

/** POST /api/auth/refresh — rotate the access cookie from the refresh cookie. */
export async function refresh(): Promise<AuthUserResponse> {
  return postJson<AuthUserResponse>("/auth/refresh");
}

/** GET /api/auth/me — the authenticated user's full profile. */
export async function me(): Promise<User> {
  return getJson<User>("/auth/me");
}

/** PATCH /api/auth/me — rectify the authenticated user's profile (Art. 16). */
export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  return patchJson<User>("/auth/me", payload);
}

/** GET /api/auth/profile/:pk — a minimal public profile. */
export async function profile(pk: string): Promise<SimpleUser> {
  return getJson<SimpleUser>(`/auth/profile/${pk}`);
}

/** GET /api/auth/navbar_info — navbar identity + verification flag. */
export async function navbarInfo(): Promise<NavbarUser> {
  return getJson<NavbarUser>("/auth/navbar_info");
}

/** POST /api/auth/request-verify — (re)send the email-verification link. */
export async function requestVerify(email: string): Promise<DetailResponse> {
  return postJson<DetailResponse>("/auth/request-verify", { email });
}

/** POST /api/auth/verify-email — confirm an email with its token. */
export async function verifyEmail(emailToken: string): Promise<DetailResponse> {
  return postJson<DetailResponse>("/auth/verify-email", { email_token: emailToken });
}

/** POST /api/auth/request-reset — send a password-reset link. */
export async function requestReset(email: string): Promise<DetailResponse> {
  return postJson<DetailResponse>("/auth/request-reset", { email });
}

/** POST /api/auth/reset-password — set a new password from a reset token. */
export async function resetPassword(payload: ResetPasswordPayload): Promise<DetailResponse> {
  return postJson<DetailResponse>("/auth/reset-password", payload);
}
