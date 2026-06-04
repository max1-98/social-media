import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { EventDetail, Game, Member } from "../../types";
import { Alert, Button, Select, Text } from "../atoms";
import type { SelectOption } from "../atoms";
import { DummyUserForm, GameCard } from "../molecules";
import type { DummyUserFormProps } from "../molecules";

/** Selection modes wired to a create-game strategy (sbmm vs social). */
const SELECTION_MODES: SelectOption[] = [
  { value: "sbmm", label: "Skill-based" },
  { value: "social", label: "Social" },
];

export interface MatchmakingPanelProps {
  /** The active event being matchmade. */
  event: EventDetail;
  /** In-progress games for the event (`GET /api/game/games/:pk`). */
  games: Game[];
  /** Whether the viewer can manage the event (admin controls). */
  isAdmin: boolean;
  /** Create the next game using the event's selection mode. */
  onCreateGame: () => void;
  /** Complete (finish) the event. */
  onCompleteEvent: () => void;
  /** Persist a new selection mode for the event (PATCH settings). */
  onChangeSelectionMode: (mode: string) => void;
  /** Submit a game's score (`"t1,t2"`). */
  onSubmitScore: (gameId: string, score: string) => void;
  /** Delete an in-progress game. */
  onDeleteGame: (gameId: string) => void;
  /** Pause a player: discards the game and deactivates the member. */
  onPausePlayer: (gameId: string, memberId: string) => void;
  /** Activate a member (move from inactive to active). */
  onActivateMember: (memberId: string) => void;
  /** Deactivate a member (move from active to inactive). */
  onDeactivateMember: (memberId: string) => void;
  /** Create a dummy (placeholder) member for the club; they appear as inactive. */
  onCreateDummyUser: DummyUserFormProps["onSubmit"];
  /** All club members eligible for the event (active + inactive). */
  members: Member[];
  /** A recoverable error to surface (e.g. "not enough players"). */
  error?: string | null;
}

function memberName(member: Member): string {
  return `${member.first_name} ${member.surname}`.trim() || member.username;
}

function MemberColumn({
  title,
  members,
  actionLabel,
  onAction,
}: {
  title: string;
  members: Member[];
  actionLabel: string;
  onAction: (memberId: string) => void;
}): ReactElement {
  return (
    <Grid size={{ xs: 12, lg: 6 }}>
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Text variant="subtitle1" gutterBottom>
          {title}
        </Text>
        <List aria-label={title} dense>
          {members.length === 0 ? (
            <ListItem>
              <Text variant="body2">None.</Text>
            </ListItem>
          ) : (
            members.map((member) => (
              <ListItem
                key={member.id}
                secondaryAction={
                  <Button
                    aria-label={`${actionLabel} ${memberName(member)}`}
                    onClick={() => {
                      onAction(member.id);
                    }}
                  >
                    {actionLabel}
                  </Button>
                }
              >
                <Text>{memberName(member)}</Text>
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Grid>
  );
}

/**
 * Organism: the active-event matchmaking surface. Shows admin controls (create a
 * game in the event's mode, complete the event), the in-progress games as
 * {@link GameCard}s, and the active/inactive member lists with activate/
 * deactivate actions. Mirrors the legacy `ActiveEvent` view but stays purely
 * data + callback driven — no `api`/`hooks` imports.
 */
export function MatchmakingPanel({
  event,
  games,
  isAdmin,
  onCreateGame,
  onCompleteEvent,
  onChangeSelectionMode,
  onSubmitScore,
  onDeleteGame,
  onPausePlayer,
  onActivateMember,
  onDeactivateMember,
  onCreateDummyUser,
  members,
  error = null,
}: MatchmakingPanelProps): ReactElement {
  const activeIds = new Set(event.active_members.map((m) => m.id));
  const inGameIds = new Set(event.in_game_members.map((m) => m.id));
  const activeMembers = members.filter((m) => activeIds.has(m.id));
  const inactiveMembers = members.filter((m) => !activeIds.has(m.id) && !inGameIds.has(m.id));
  const lowPlayers =
    isAdmin && event.mode !== "peg_board" && event.active_members.length < 2 * event.team_size + 2;
  // Always surface the event's current mode, even if it isn't one of the
  // create-game strategies (e.g. a legacy "peg_board" value).
  const modeOptions = SELECTION_MODES.some((m) => m.value === event.mode)
    ? SELECTION_MODES
    : [{ value: event.mode, label: event.mode }, ...SELECTION_MODES];

  return (
    <Stack spacing={2}>
      {isAdmin ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "flex-end" }, flexWrap: "wrap" }}
        >
          <Select
            label="Game type"
            options={[{ value: event.game_type.name, label: event.game_type.name }]}
            value={event.game_type.name}
            disabled
          />
          <Select
            label="Selection mode"
            options={modeOptions}
            value={event.mode}
            onChange={(e) => {
              onChangeSelectionMode(e.target.value);
            }}
          />
          <Stack direction="row" spacing={1} sx={{ ml: { sm: "auto" } }}>
            <Button onClick={onCreateGame}>Create game</Button>
            <Button variant="outlined" onClick={onCompleteEvent}>
              Complete event
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {lowPlayers ? (
        <Alert severity="warning">
          Few available players — creating a game now may repeat recent matchups. Wait for more
          players or for current games to finish for the best matchmaking.
        </Alert>
      ) : null}
      {error !== null ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={1} component="section" aria-label="In-progress games">
        {games.length === 0 ? (
          <Grid size={12}>
            <Text variant="body2">No games in progress.</Text>
          </Grid>
        ) : (
          games.map((game) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={game.id}>
              <GameCard
                game={game}
                isAdmin={isAdmin}
                onSubmitScore={onSubmitScore}
                onDelete={onDeleteGame}
                onPausePlayer={onPausePlayer}
              />
            </Grid>
          ))
        )}
      </Grid>

      {isAdmin ? (
        <Grid container spacing={1}>
          <MemberColumn
            title="Active members"
            members={activeMembers}
            actionLabel="Deactivate"
            onAction={onDeactivateMember}
          />
          <MemberColumn
            title="Inactive members"
            members={inactiveMembers}
            actionLabel="Activate"
            onAction={onActivateMember}
          />
        </Grid>
      ) : null}

      {isAdmin ? (
        <Paper variant="outlined" sx={{ p: 1 }}>
          <Text variant="subtitle1" gutterBottom>
            Add a dummy user
          </Text>
          <Text variant="body2" gutterBottom>
            Create a placeholder member (no account); they appear under inactive members, ready to
            activate into the night.
          </Text>
          <DummyUserForm onSubmit={onCreateDummyUser} />
        </Paper>
      ) : null}
    </Stack>
  );
}
