import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useParams } from "react-router-dom";

import { ApiRequestError, eloApi } from "../api";
import { Alert, Spinner, Text } from "../components/atoms";
import { useAuth } from "../hooks";
import type { Elo } from "../types";

/**
 * Lists a user's ELO ratings (one card per game type) from
 * `eloApi.elosForUser`. Reads the `:username` route param, falling back to the
 * signed-in user when omitted.
 *
 * Intended route: `/elos/:username` (also `/elos` for the current user).
 */
export function GameTypeElosPage(): ReactElement {
  const { username: paramUsername } = useParams<{ username: string }>();
  const { user } = useAuth();
  const username = paramUsername ?? user?.username ?? "";

  const [elos, setElos] = useState<Elo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username === "") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void eloApi
      .elosForUser(username)
      .then((rows) => {
        if (!cancelled) setElos(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : "Could not load ELO ratings.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  return (
    <Stack spacing={3}>
      <Text variant="h1">ELO ratings</Text>
      {loading ? (
        <Spinner />
      ) : error !== null ? (
        <Alert severity="error">{error}</Alert>
      ) : elos.length === 0 ? (
        <Text>No sports stats yet. Take part in a club event to start earning ratings.</Text>
      ) : (
        <Grid container spacing={2}>
          {elos.map((elo) => (
            <Grid
              key={`${elo.sport}-${elo.style}-${elo.game_type}`}
              size={{ xs: 12, sm: 6, md: 4 }}
            >
              <Card>
                <CardContent>
                  <Text variant="overline">
                    {elo.sport} · {elo.style}
                  </Text>
                  <Text variant="h4" gutterBottom>
                    {elo.elo}
                  </Text>
                  <Stack spacing={0.25}>
                    <Text variant="body2">Game type: {elo.game_type}</Text>
                    <Text variant="body2">
                      Wins: {elo.wins} / {elo.total_games} games
                    </Text>
                    <Text variant="body2">Win rate: {Math.round(elo.winrate * 100) / 100}</Text>
                    <Text variant="body2">Current streak: {elo.winstreak}</Text>
                    <Text variant="body2">Best streak: {elo.best_winstreak}</Text>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
