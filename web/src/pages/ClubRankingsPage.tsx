import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { ApiRequestError, fixturesApi, gamesApi } from "../api";
import { Select, Spinner, Text } from "../components/atoms";
import { ClubLeaderboard } from "../components/organisms";
import type { ClubLadderEntry } from "../types";

/**
 * Global club rankings: the club ELO ladder across all clubs, scoped to a chosen
 * game type (the ladder is per game type, so a selection is required). Game-type
 * options come from `gamesApi.gameTypes`; rows from `fixturesApi.clubLeaderboard`.
 *
 * Route: `/club-rankings` (global page, linked from the navbar).
 */
export function ClubRankingsPage(): ReactElement {
  const [gameTypes, setGameTypes] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [entries, setEntries] = useState<ClubLadderEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the game-type options once, defaulting the selection to the first.
  useEffect(() => {
    let cancelled = false;
    void gamesApi
      .gameTypes()
      .then((types) => {
        if (cancelled) return;
        const names = types.map((type) => type.name);
        setGameTypes(names);
        if (names.length > 0) {
          const [first] = names;
          setSelected((current) => (current === "" ? first : current));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : "Could not load game types.");
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reload the ladder whenever the selected game type changes.
  useEffect(() => {
    if (selected === "") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fixturesApi
      .clubLeaderboard(selected)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiRequestError ? err.message : "Could not load the club ladder.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <Stack spacing={3}>
      <Text variant="h1">Club rankings</Text>
      {optionsLoading ? (
        <Spinner />
      ) : gameTypes.length === 0 ? (
        <Text>No game types are available yet.</Text>
      ) : (
        <>
          <Select
            label="Game type"
            options={gameTypes.map((name) => ({ value: name, label: name }))}
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
            }}
            sx={{ maxWidth: 280 }}
          />
          <ClubLeaderboard entries={entries} loading={loading} error={error} />
        </>
      )}
    </Stack>
  );
}
