import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";

import { ApiRequestError, clubsApi } from "../api";
import type { ClubBounds } from "../api";
import { Alert, Text } from "../components/atoms";
import { MapView } from "../components/organisms";
import type { MapBounds, MapClubMarker } from "../components/organisms";
import { useUserLocation } from "../hooks";
import type { ManyClub } from "../types";

/** Default map centre (UK) and zoom, mirroring the legacy discover screen. */
const DEFAULT_CENTER = { lat: 54.257651, lng: -2.681402 };
const DEFAULT_ZOOM = 6;
const LOCATED_ZOOM = 10;

function toClubBounds(bounds: MapBounds): ClubBounds {
  return {
    southwest_lat: bounds.southWest.lat,
    southwest_lng: bounds.southWest.lng,
    northeast_lat: bounds.northEast.lat,
    northeast_lng: bounds.northEast.lng,
  };
}

function toMarkers(clubs: ManyClub[]): MapClubMarker[] {
  return clubs
    .filter((club): club is ManyClub & { coordinates: NonNullable<ManyClub["coordinates"]> } => {
      return club.coordinates !== null;
    })
    .map((club) => ({
      id: club.id,
      name: club.name,
      coordinates: club.coordinates,
      description: club.sport_type?.name ? `${club.sport_type.name} club` : club.info,
    }));
}

/**
 * Page — route `/clubs`. The map-based club discovery screen. Centres on the
 * visitor's location (via {@link useUserLocation}) when available, renders club
 * pins through {@link MapView}, and refetches clubs from `clubsApi.allClubs`
 * whenever the visible map bounds change. Selecting a pin opens the club page.
 */
export function DiscoverClubsPage(): ReactElement {
  const navigate = useNavigate();
  const { location } = useUserLocation();
  const [clubs, setClubs] = useState<ManyClub[]>([]);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchInBounds = useCallback((bounds?: ClubBounds): void => {
    const id = ++requestId.current;
    clubsApi
      .allClubs(bounds)
      .then((data) => {
        // Ignore stale responses if the user kept panning.
        if (id === requestId.current) {
          setClubs(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (id === requestId.current) {
          setError(err instanceof ApiRequestError ? err.message : "Failed to load clubs.");
        }
      });
  }, []);

  useEffect(() => {
    fetchInBounds();
  }, [fetchInBounds]);

  const handleBoundsChange = useCallback(
    (bounds: MapBounds): void => {
      fetchInBounds(toClubBounds(bounds));
    },
    [fetchInBounds],
  );

  const handleSelect = useCallback(
    (id: number): void => {
      void navigate(`/club/${String(id)}`);
    },
    [navigate],
  );

  return (
    <Stack spacing={3}>
      <Text variant="h1">Discover clubs</Text>
      {error !== null && <Alert severity="error">{error}</Alert>}
      <Box sx={{ height: "70vh", width: "100%" }}>
        <MapView
          center={location ?? DEFAULT_CENTER}
          zoom={location ? LOCATED_ZOOM : DEFAULT_ZOOM}
          clubs={toMarkers(clubs)}
          userLocation={location}
          onBoundsChange={handleBoundsChange}
          onClubSelect={handleSelect}
          ariaLabel="Club discovery map"
        />
      </Box>
    </Stack>
  );
}
