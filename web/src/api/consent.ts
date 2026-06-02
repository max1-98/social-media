/**
 * Consent logging. Mirrors `POST /api/auth/consent` (see the `consent_is_logged`
 * parity test). Every consent choice is recorded server-side in `consent_log`.
 */

import type { DetailResponse } from "./auth";
import { postJson } from "./http";

/** Categories of consent the CMP records. */
export type ConsentType = "ads" | "analytics" | "essential";

/** The user's choice for a consent category. */
export type ConsentChoice = "accept" | "refuse";

export interface ConsentPayload {
  consent_type: ConsentType;
  choice: ConsentChoice;
}

/** POST /api/auth/consent — record a single consent choice. */
export async function logConsent(payload: ConsentPayload): Promise<DetailResponse> {
  return postJson<DetailResponse>("/auth/consent", payload);
}
