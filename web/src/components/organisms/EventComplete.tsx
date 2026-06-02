import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { CompleteGame, EventStatsResult, StatPlayer } from "../../types";
import { Button, Text } from "../atoms";

export interface EventCompleteProps {
  /** Per-event leaderboards (`GET /api/event/:pk/stats`). */
  stats: EventStatsResult | null;
  /** Completed games for the event (`GET /api/game/event/games/:pk`). */
  completedGames: CompleteGame[];
  /** Whether the viewer can reactivate the event (admin). */
  isAdmin: boolean;
  /** Reverse completion (`POST /api/event/complete` toggles status). */
  onReactivate: () => void;
}

interface StatBoard {
  key: keyof EventStatsResult;
  title: (top: StatPlayer) => string;
}

const BOARDS: StatBoard[] = [
  {
    key: "best_winstreak_players",
    title: (p) => `Best winstreak (${String(p.best_winstreak ?? 0)})`,
  },
  {
    key: "highest_win_rate_players",
    title: (p) => `Best win rate (${(Math.ceil((p.win_rate ?? 0) * 100) / 100).toString()} W/L)`,
  },
  {
    key: "highest_elo_gain_players",
    title: (p) => `Most ELO gained (${String(p.elo_gain ?? 0)})`,
  },
  {
    key: "most_games_played_players",
    title: (p) => `Hardest workers (${String(p.games_played ?? 0)} games)`,
  },
  { key: "most_wins_players", title: (p) => `Most wins (${String(p.wins ?? 0)})` },
];

function StatCard({ title, players }: { title: string; players: StatPlayer[] }): ReactElement {
  return (
    <Grid size={{ xs: 6, lg: 3 }}>
      <Card variant="outlined">
        <CardContent>
          <Text variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Text>
          {players.map((player, index) => (
            <Text key={`${player.name}-${String(index)}`}>{player.name}</Text>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

function gameSummary(game: CompleteGame): string {
  const team = (players: CompleteGame["team1"]): string =>
    players.map((p) => `${p.first_name} ${p.surname}`.trim()).join(" & ");
  return `${team(game.team1)} vs ${team(game.team2)} — ${game.score}`;
}

/**
 * Organism: the completed-event view — key-stat leaderboards plus the list of all
 * games played. For admins it offers a reactivate control. Pure presentation; the
 * page supplies the data and the reactivate callback.
 */
export function EventComplete({
  stats,
  completedGames,
  isAdmin,
  onReactivate,
}: EventCompleteProps): ReactElement {
  return (
    <Stack spacing={2}>
      {isAdmin ? (
        <Button onClick={onReactivate} aria-label="Reactivate event">
          Re-activate
        </Button>
      ) : null}

      <section aria-label="Key stats">
        <Text variant="h5" gutterBottom>
          Key stats
        </Text>
        {stats === null ? (
          <Text variant="body2">No stats available.</Text>
        ) : (
          <Grid container spacing={1}>
            {BOARDS.map((board) => {
              const players = stats[board.key];
              if (players.length === 0) return null;
              return <StatCard key={board.key} title={board.title(players[0])} players={players} />;
            })}
          </Grid>
        )}
      </section>

      <section aria-label="All games">
        <Text variant="h5" gutterBottom>
          All games
        </Text>
        {completedGames.length === 0 ? (
          <Text variant="body2">No games were played.</Text>
        ) : (
          <Stack spacing={0.5}>
            {completedGames.map((game) => (
              <Text key={game.id}>{gameSummary(game)}</Text>
            ))}
          </Stack>
        )}
      </section>
    </Stack>
  );
}
