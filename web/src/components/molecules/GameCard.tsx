import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { Game, MemberEvent } from "../../types";
import { Button, Text } from "../atoms";

import { ScoreInput } from "./ScoreInput";

export interface GameCardProps {
  /** The in-progress game to display (two teams of members). */
  game: Game;
  /**
   * When true, the viewer can manage the game: enter a score, delete it, or
   * pause a player. Mirrors the legacy `club.is_club_admin` gate.
   */
  isAdmin?: boolean;
  /** Submit the game's final score (`"t1,t2"`). Required when `isAdmin`. */
  onSubmitScore?: (gameId: string, score: string) => void;
  /** Delete (discard) the in-progress game. */
  onDelete?: (gameId: string) => void;
  /** Pause a player: removes the game and deactivates that member. */
  onPausePlayer?: (gameId: string, memberId: string) => void;
}

function playerLabel(player: MemberEvent): string {
  const name = `${player.first_name} ${player.surname}`.trim();
  return player.elo === null ? name : `${name} (${String(player.elo)})`;
}

function TeamList({
  team,
  label,
  isAdmin,
  onPause,
}: {
  team: MemberEvent[];
  label: string;
  isAdmin: boolean;
  onPause: ((memberId: string) => void) | undefined;
}): ReactElement {
  return (
    <Stack spacing={0.5} aria-label={label}>
      {team.map((player) => (
        <Stack key={player.id} spacing={1} sx={{ flexDirection: "row", alignItems: "center" }}>
          <Text>{playerLabel(player)}</Text>
          {isAdmin && onPause ? (
            <Button
              aria-label={`Pause ${player.first_name} ${player.surname}`.trim()}
              onClick={() => {
                onPause(player.id);
              }}
            >
              Pause
            </Button>
          ) : null}
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * Molecule: displays one in-progress game — team 1 versus team 2 with each
 * player's name and ELO. For admins it embeds a {@link ScoreInput} to record the
 * result plus controls to delete the game or pause a player. Pure presentation:
 * all mutations are delegated to callbacks (the page owns the `api` calls).
 */
export function GameCard({
  game,
  isAdmin = false,
  onSubmitScore,
  onDelete,
  onPausePlayer,
}: GameCardProps): ReactElement {
  return (
    <Card variant="outlined" aria-label={`Game ${game.id}`}>
      <CardContent>
        <TeamList
          team={game.team1}
          label="Team 1"
          isAdmin={isAdmin}
          onPause={
            onPausePlayer
              ? (memberId) => {
                  onPausePlayer(game.id, memberId);
                }
              : undefined
          }
        />
        <Divider sx={{ my: 1 }}>
          <Text variant="overline">vs</Text>
        </Divider>
        <TeamList
          team={game.team2}
          label="Team 2"
          isAdmin={isAdmin}
          onPause={
            onPausePlayer
              ? (memberId) => {
                  onPausePlayer(game.id, memberId);
                }
              : undefined
          }
        />
        {isAdmin ? (
          <Stack spacing={1} sx={{ mt: 2 }}>
            {onSubmitScore ? (
              <ScoreInput
                onSubmit={(score) => {
                  onSubmitScore(game.id, score);
                }}
              />
            ) : null}
            {onDelete ? (
              <Button
                aria-label={`Delete game ${game.id}`}
                onClick={() => {
                  onDelete(game.id);
                }}
              >
                Delete game
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}
