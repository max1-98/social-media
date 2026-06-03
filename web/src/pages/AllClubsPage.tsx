import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";

import { ApiRequestError, clubsApi } from "../api";
import { Alert, Spinner, Text } from "../components/atoms";
import { ClubCard } from "../components/organisms";
import type { ManyClub } from "../types";

/**
 * Page — route `/clubs/all`. A responsive grid of every active club, rendered
 * with the {@link ClubCard} organism. Selecting a card navigates to the club's
 * detail page. Data comes from `clubsApi.allClubs`.
 */
export function AllClubsPage(): ReactElement {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<ManyClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    clubsApi
      .allClubs()
      .then((data) => {
        if (active) setClubs(data);
      })
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof ApiRequestError ? err.message : "Failed to load clubs.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelect = useCallback(
    (id: string): void => {
      void navigate(`/club/${id}`);
    },
    [navigate],
  );

  return (
    <Stack spacing={3}>
      <Text variant="h1">All clubs</Text>
      {error !== null && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Spinner />
      ) : (
        <Grid container spacing={2}>
          {clubs.map((club) => (
            <Grid key={club.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ClubCard club={club} onSelect={handleSelect} />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
