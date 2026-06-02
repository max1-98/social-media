/**
 * GDPR data-subject rights. Mirrors `GET /api/account/export` (portability) and
 * `DELETE /api/account` (erasure-by-anonymization). See `server/src/domain/auth.rs`.
 */

import type { DetailResponse } from "./auth";
import { del, getJson } from "./http";

/** A single recorded consent choice (`ConsentEntry`). */
export interface ExportConsent {
  consent_type: string;
  choice: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/** A club membership snapshot (`MembershipEntry`). */
export interface ExportMembership {
  club_id: number;
  club_name: string;
  is_admin: boolean;
  is_member: boolean;
  date_joined: string;
}

/** An authored post (`PostEntry`). */
export interface ExportPost {
  id: number;
  content: string;
  club_id: number | null;
  created_at: string;
}

/** Profile portion of the export (`ExportUser`). */
export interface ExportUser {
  id: number;
  username: string;
  email: string | null;
  first_name: string | null;
  surname: string | null;
  date_of_birth: string | null;
  biological_gender: string;
  email_verified: boolean;
  date_joined: string;
  tier: string;
}

/** The full account snapshot returned by `GET /account/export`. */
export interface AccountExport {
  user: ExportUser;
  consents: ExportConsent[];
  memberships: ExportMembership[];
  posts: ExportPost[];
}

/** GET /api/account/export — the user's data as portable JSON (GDPR Art. 20). */
export async function exportAccount(): Promise<AccountExport> {
  return getJson<AccountExport>("/account/export");
}

/** DELETE /api/account — erase the account by anonymization (re-confirms password). */
export async function deleteAccount(password: string): Promise<DetailResponse> {
  return del<DetailResponse>("/account", { password });
}
