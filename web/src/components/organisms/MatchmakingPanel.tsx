import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";

import type { EventDetail, Game, MemberEvent } from "../../types";
import { Alert, Button, Chip, Icon, Select, Text } from "../atoms";
import type { SelectOption } from "../atoms";
import { EventMemberRow, GameCard, SortControl, memberName } from "../molecules";
import type { DummyUserFormProps, MemberSearchFormProps } from "../molecules";

import { AddUserModal } from "./AddUserModal";

/** Selection modes wired to a create-game strategy (sbmm vs social). */
const SELECTION_MODES: SelectOption[] = [
  { value: "sbmm", label: "Skill-based" },
  { value: "social", label: "Social" },
];

/** Member sort keys offered in each panel. */
const SORT_OPTIONS: SelectOption[] = [
  { value: "elo", label: "ELO" },
  { value: "name", label: "Name" },
];

export type SortKey = "elo" | "name";
export type SortDir = "asc" | "desc";

/**
 * Order two members by `key`/`dir`. ELO sorts numerically with unranked members
 * (`elo === null`) always last regardless of direction; name uses locale compare.
 */
export function compareMembers(a: MemberEvent, b: MemberEvent, key: SortKey, dir: SortDir): number {
  let base: number;
  if (key === "elo") {
    if (a.elo === null && b.elo === null) base = 0;
    else if (a.elo === null) return 1;
    else if (b.elo === null) return -1;
    else base = a.elo - b.elo;
  } else {
    base = memberName(a).localeCompare(memberName(b));
  }
  return dir === "asc" ? base : -base;
}

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
  /** Create a dummy (placeholder) member; the page auto-activates them. */
  onCreateDummyUser: DummyUserFormProps["onSubmit"];
  /** Invite a platform user to the club + event by their opaque id. */
  onInviteMember: (userId: string) => Promise<void>;
  /** Run a paginated username search for members to invite. */
  onSearchUsers: MemberSearchFormProps["onSearch"];
  /** All club members eligible for the event (active + inactive), with ELO. */
  members: MemberEvent[];
  /** A recoverable error to surface (e.g. "not enough players"). */
  error?: string | null;
}

function MemberColumn({
  title,
  members,
  actionLabel,
  onAction,
  accentColor,
  countColor,
}: {
  title: string;
  members: MemberEvent[];
  actionLabel: string;
  onAction: (memberId: string) => void;
  accentColor: string;
  countColor: "success" | "default";
}): ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>("elo");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const sorted = useMemo(
    () => [...members].sort((a, b) => compareMembers(a, b, sortKey, sortDir)),
    [members, sortKey, sortDir],
  );

  return (
    <Grid size={{ xs: 12, lg: 6 }}>
      <Paper variant="outlined" sx={{ p: 1.5, borderLeft: 3, borderColor: accentColor }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", justifyContent: "space-between", mb: 1, flexWrap: "wrap" }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Text variant="subtitle1">{title}</Text>
            <Chip size="small" color={countColor} label={String(members.length)} />
          </Stack>
          <SortControl
            sortKey={sortKey}
            direction={sortDir}
            options={SORT_OPTIONS}
            onSortKeyChange={(key) => {
              setSortKey(key === "name" ? "name" : "elo");
            }}
            onDirectionToggle={() => {
              setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            }}
          />
        </Stack>
        <List aria-label={title} dense>
          {sorted.length === 0 ? (
            <ListItem>
              <Text
                variant="body2"
                sx={{ color: "text.secondary", textAlign: "center", width: "100%", py: 2 }}
              >
                None.
              </Text>
            </ListItem>
          ) : (
            sorted.map((member) => (
              <EventMemberRow
                key={member.id}
                member={member}
                actionLabel={actionLabel}
                onAction={onAction}
              />
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
 * {@link GameCard}s, and the active/inactive member lists — each showing every
 * member's ELO and sortable by ELO or name — with activate/deactivate actions.
 * Mirrors the legacy `ActiveEvent` view but stays purely data + callback driven.
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
  onInviteMember,
  onSearchUsers,
  members,
  error = null,
}: MatchmakingPanelProps): ReactElement {
  const [addUserOpen, setAddUserOpen] = useState(false);
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
    <Stack spacing={3}>
      {isAdmin ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
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
              sx={{ minWidth: 180 }}
            />
            <Select
              label="Selection mode"
              options={modeOptions}
              value={event.mode}
              onChange={(e) => {
                onChangeSelectionMode(e.target.value);
              }}
              sx={{ minWidth: 180 }}
            />
            <Stack direction="row" spacing={1} sx={{ ml: { sm: "auto" } }}>
              <Button variant="contained" onClick={onCreateGame}>
                Create game
              </Button>
              <Button variant="outlined" color="error" onClick={onCompleteEvent}>
                Complete event
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      {lowPlayers ? (
        <Alert severity="warning">
          Few available players — creating a game now may repeat recent matchups. Wait for more
          players or for current games to finish for the best matchmaking.
        </Alert>
      ) : null}
      {error !== null ? <Alert severity="error">{error}</Alert> : null}

      <Box component="section" aria-label="In-progress games">
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <Text variant="h6">In-progress games</Text>
          <Chip size="small" label={String(games.length)} />
        </Stack>
        <Grid container spacing={2}>
          {games.length === 0 ? (
            <Grid size={12}>
              <Text variant="body2" sx={{ color: "text.secondary" }}>
                No games in progress.
              </Text>
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
      </Box>

      {isAdmin ? (
        <Box component="section">
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
          >
            <Text variant="h6">Members</Text>
            <Button
              variant="contained"
              startIcon={<Icon as={PersonAddIcon} fontSize="small" />}
              onClick={() => {
                setAddUserOpen(true);
              }}
            >
              Add user
            </Button>
          </Stack>
          <Grid container spacing={2}>
            <MemberColumn
              title="Active members"
              members={activeMembers}
              actionLabel="Deactivate"
              onAction={onDeactivateMember}
              accentColor="success.main"
              countColor="success"
            />
            <MemberColumn
              title="Inactive members"
              members={inactiveMembers}
              actionLabel="Activate"
              onAction={onActivateMember}
              accentColor="divider"
              countColor="default"
            />
          </Grid>
          <AddUserModal
            open={addUserOpen}
            onClose={() => {
              setAddUserOpen(false);
            }}
            onCreateDummyUser={onCreateDummyUser}
            onInviteMember={onInviteMember}
            onSearch={onSearchUsers}
          />
        </Box>
      ) : null}
    </Stack>
  );
}
