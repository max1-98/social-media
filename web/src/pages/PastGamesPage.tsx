import Stack from "@mui/material/Stack";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { ApiRequestError, gamesApi } from "../api";
import { Chip, Select, Text } from "../components/atoms";
import { DataGrid, GameStatsSummary } from "../components/organisms";
import type { DataGridColumn } from "../components/organisms";
import { useAuth } from "../hooks";
import type { CompleteGame, MemberEvent } from "../types";

import { pastGamesStats, userResult } from "./pastGamesStats";

/** How many games to load; large enough that virtual scrolling earns its keep. */
const GAMES_LIMIT = 500;

const ALL_TYPES = "all";

function teamNames(members: MemberEvent[]): string {
  return members.map((m) => m.username).join(", ") || "—";
}

function formatDate(start: string): string {
  const t = start.indexOf("T");
  return t === -1 ? start : start.slice(0, t);
}

/**
 * Lists the signed-in user's completed games in a reusable virtualised
 * {@link DataGrid} with game-type filtering, column sorting, and a
 * {@link GameStatsSummary} panel (record, per-type breakdown, streaks, and top
 * partners/opponents). Route: `/games` (auth-guarded).
 */
export function PastGamesPage(): ReactElement {
  const { user } = useAuth();
  const username = user?.username ?? "";

  const [games, setGames] = useState<CompleteGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);

  useEffect(() => {
    let cancelled = false;
    void gamesApi
      .userGames({ num_of_games: GAMES_LIMIT })
      .then((rows) => {
        if (!cancelled) setGames(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : "Could not load your games.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const typeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const g of games) {
      if (g.game_type_name !== null) names.add(g.game_type_name);
    }
    return [
      { value: ALL_TYPES, label: "All game types" },
      ...[...names].sort((a, b) => a.localeCompare(b)).map((n) => ({ value: n, label: n })),
    ];
  }, [games]);

  const filteredGames = useMemo(
    () => (typeFilter === ALL_TYPES ? games : games.filter((g) => g.game_type_name === typeFilter)),
    [games, typeFilter],
  );

  const stats = useMemo(() => pastGamesStats(filteredGames, username), [filteredGames, username]);

  const columns: DataGridColumn<CompleteGame>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        render: (g) => formatDate(g.start_time),
        sortable: true,
        sortValue: (g) => g.start_time,
        width: 130,
      },
      {
        key: "game_type",
        header: "Game type",
        render: (g) => g.game_type_name ?? "—",
        sortable: true,
        sortValue: (g) => g.game_type_name ?? "",
      },
      { key: "team1", header: "Team 1", render: (g) => teamNames(g.team1) },
      { key: "team2", header: "Team 2", render: (g) => teamNames(g.team2) },
      {
        key: "score",
        header: "Score",
        render: (g) => g.score,
        sortable: true,
        sortValue: (g) => g.score,
        width: 100,
      },
      {
        key: "result",
        header: "Result",
        width: 110,
        sortable: true,
        sortValue: (g) => (userResult(g, username) === "Won" ? 1 : 0),
        render: (g) => {
          const result = userResult(g, username);
          if (result === "—") return "—";
          return (
            <Chip
              label={result}
              size="small"
              color={result === "Won" ? "success" : "error"}
              variant="outlined"
            />
          );
        },
      },
    ],
    [username],
  );

  return (
    <Stack spacing={3}>
      <Text variant="h1">Past games</Text>

      {!loading && error === null && games.length > 0 ? (
        <>
          <GameStatsSummary stats={stats} />
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Select
              label="Game type"
              options={typeOptions}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
              }}
              sx={{ minWidth: 180 }}
            />
          </Stack>
        </>
      ) : null}

      <DataGrid
        rows={filteredGames}
        columns={columns}
        getRowId={(g) => g.id}
        ariaLabel="Completed games"
        loading={loading}
        error={error}
        emptyMessage="You have not completed any games yet."
        initialSort={{ key: "date", direction: "desc" }}
      />
    </Stack>
  );
}
