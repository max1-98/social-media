// Barrel for the typed Rust API client. Cross-layer imports come through here.
//
// The low-level HTTP helpers and the error type are re-exported directly; each
// resource is re-exported as a namespace (`authApi.login(...)`) so call sites
// read clearly and short verbs like `me`/`profile` never collide across modules.

export { getJson, postJson, patchJson, patchForm, del, ApiRequestError } from "./http";

export * as accountApi from "./account";
export * as authApi from "./auth";
export * as clubsApi from "./clubs";
export * as consentApi from "./consent";
export * as eloApi from "./elo";
export * as eventsApi from "./events";
export * as gamesApi from "./games";

export type { AuthUserResponse, DetailResponse, RegisterPayload, LoginPayload } from "./auth";
export type {
  AccountExport,
  ExportUser,
  ExportConsent,
  ExportMembership,
  ExportPost,
} from "./account";
export type { ConsentChoice, ConsentType, ConsentPayload } from "./consent";
export type {
  AddressPayload,
  AddressResponse,
  AddSportPayload,
  ClubBounds,
  CreateClubPayload,
  EditClubPayload,
  MessageResponse,
  SocialLinksPayload,
} from "./clubs";
export type {
  CreateEventPayload,
  CreateSeriesPayload,
  EventSettingsPayload,
  EventStats,
} from "./events";
export type { CompleteGamePayload } from "./games";
