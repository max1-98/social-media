/**
 * `useUserLocation` — resolve the visitor's coordinates via the browser
 * Geolocation API. Replaces the legacy leaflet `map.locate()` flow
 * (`locate_user.js`) with a framework-light hook that does not depend on
 * react-leaflet, so any component (map or not) can consume it.
 *
 * Boundaries: hooks may import `api`, `hooks`, `contexts`, `types` only — this
 * one imports `types` for the shared {@link Coordinates} shape.
 *
 * The result is cached in `sessionStorage` (key `userLocation`) to mirror the
 * legacy behaviour and avoid re-prompting within a session.
 */

import { useCallback, useEffect, useState } from "react";

import type { Coordinates } from "../types";

const STORAGE_KEY = "userLocation";

/** State returned by {@link useUserLocation}. */
export interface UserLocationState {
  /** The resolved position, or `null` while pending / when unavailable. */
  location: Coordinates | null;
  /** True while a geolocation request is in flight. */
  loading: boolean;
  /** A human-readable error if the lookup failed or was denied. */
  error: string | null;
  /** Imperatively (re)request the location, e.g. on a button press. */
  locate: () => void;
}

function readCached(): Coordinates | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { lat?: unknown }).lat === "number" &&
      typeof (parsed as { lng?: unknown }).lng === "number"
    ) {
      const { lat, lng } = parsed as Coordinates;
      return { lat, lng };
    }
  } catch {
    // Ignore malformed cache; we'll re-request below.
  }
  return null;
}

function cache(coords: Coordinates): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
  } catch {
    // Storage may be unavailable (private mode); the location still works.
  }
}

/**
 * Resolve the visitor's coordinates. Reads a cached value synchronously, then
 * (if absent) requests a fresh fix on mount. Call `locate()` to re-request.
 */
export function useUserLocation(): UserLocationState {
  const [location, setLocation] = useState<Coordinates | null>(() => readCached());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback((): void => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Location is not supported by this browser.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        cache(coords);
        setLocation(coords);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (location === null) locate();
  }, [location, locate]);

  return { location, loading, error, locate };
}
