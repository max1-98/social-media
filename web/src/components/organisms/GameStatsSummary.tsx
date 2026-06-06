import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { FormStats, PastGamesStats, PlayerTally, RecordStats, TypeStats } from "../../types";
import { Chip, Text } from "../atoms";

export interface GameStatsSummaryProps {
  /** The derived statistics to display. */
  stats: PastGamesStats;
}

function pct(rate: number): string {
  return `${String(Math.round(rate * 100))}%`;
}

function StatCard({ title, children }: { title: string; children: ReactElement }): ReactElement {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 220 }}>
      <Text variant="overline" color="text.secondary">
        {title}
      </Text>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Paper>
  );
}

function RecordCard({ record }: { record: RecordStats }): ReactElement {
  return (
    <StatCard title="Record">
      <Stack spacing={0.5}>
        <Text variant="h4">{pct(record.winRate)}</Text>
        <Text variant="body2" color="text.secondary">
          {record.wins}W – {record.losses}L · {record.total} games
        </Text>
      </Stack>
    </StatCard>
  );
}

function FormCard({ form }: { form: FormStats }): ReactElement {
  return (
    <StatCard title="Form">
      <Stack spacing={1}>
        <Text variant="body2" color="text.secondary">
          Streak {form.currentWinStreak} · Best {form.bestWinStreak}
        </Text>
        <Stack direction="row" spacing={0.5} aria-label="Recent form">
          {form.lastN.length === 0 ? (
            <Text variant="body2">No games yet</Text>
          ) : (
            form.lastN.map((result, i) => (
              <Chip
                key={`${String(i)}-${result}`}
                label={result}
                size="small"
                color={result === "W" ? "success" : "error"}
              />
            ))
          )}
        </Stack>
      </Stack>
    </StatCard>
  );
}

function PlayerListCard({
  title,
  players,
}: {
  title: string;
  players: PlayerTally[];
}): ReactElement {
  return (
    <StatCard title={title}>
      {players.length === 0 ? (
        <Text variant="body2" color="text.secondary">
          None yet
        </Text>
      ) : (
        <Stack spacing={0.5}>
          {players.map((p) => (
            <Stack
              key={p.username}
              direction="row"
              spacing={1}
              sx={{ justifyContent: "space-between" }}
            >
              <Text variant="body2">@{p.username}</Text>
              <Text variant="body2" color="text.secondary">
                {p.games}
              </Text>
            </Stack>
          ))}
        </Stack>
      )}
    </StatCard>
  );
}

function TypeBreakdown({ byType }: { byType: TypeStats[] }): ReactElement {
  return (
    <StatCard title="By game type">
      {byType.length === 0 ? (
        <Text variant="body2" color="text.secondary">
          No games yet
        </Text>
      ) : (
        <Stack spacing={0.5}>
          {byType.map((t) => (
            <Stack
              key={t.name}
              direction="row"
              spacing={1}
              sx={{ justifyContent: "space-between" }}
            >
              <Text variant="body2">{t.name}</Text>
              <Text variant="body2" color="text.secondary">
                {pct(t.winRate)} · {t.total}
              </Text>
            </Stack>
          ))}
        </Stack>
      )}
    </StatCard>
  );
}

/**
 * Organism: the "game head" stats panel for the Past games page. Pure
 * presentation of a {@link PastGamesStats} — record, per-game-type breakdown,
 * streaks/recent form, and top partners/opponents. Colours come from theme
 * tokens (success/error) so both schemes read well.
 */
export function GameStatsSummary({ stats }: GameStatsSummaryProps): ReactElement {
  return (
    <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
      <RecordCard record={stats.record} />
      <FormCard form={stats.form} />
      <TypeBreakdown byType={stats.byType} />
      <PlayerListCard title="Top partners" players={stats.partners} />
      <PlayerListCard title="Top opponents" players={stats.opponents} />
    </Stack>
  );
}
