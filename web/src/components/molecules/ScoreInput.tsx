import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { Alert, Button, Input } from "../atoms";

export interface ScoreInputProps {
  /** Label for the first team's score field (e.g. "Team 1"). */
  team1Label?: string;
  /** Label for the second team's score field (e.g. "Team 2"). */
  team2Label?: string;
  /**
   * Minimum score the winning side must reach before submission is allowed.
   * Mirrors the legacy rule that a game ends once a team reaches 21.
   */
  winningScore?: number;
  /**
   * Submit the final score as the `"team1,team2"` string the backend expects
   * (`POST /api/game/complete`). The page wires this to `gamesApi.completeGame`;
   * the molecule stays free of the `api` layer per atomic-design boundaries.
   */
  onSubmit: (score: string) => void;
  /** Disable the controls while a submission is in flight. */
  disabled?: boolean;
}

/**
 * Molecule: enter and submit a single game's score. Collects each team's points
 * and only allows submission once one side has reached the winning score,
 * matching the legacy game-completion guard. Emits the score as `"t1,t2"`.
 */
export function ScoreInput({
  team1Label = "Team 1 score",
  team2Label = "Team 2 score",
  winningScore = 21,
  onSubmit,
  disabled = false,
}: ScoreInputProps): ReactElement {
  const [team1, setTeam1] = useState("0");
  const [team2, setTeam2] = useState("0");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const s1 = Number.parseInt(team1, 10);
    const s2 = Number.parseInt(team2, 10);
    if (Number.isNaN(s1) || Number.isNaN(s2)) {
      setError("Enter a number for each team.");
      return;
    }
    if (s1 < winningScore && s2 < winningScore) {
      setError(`A team must reach ${String(winningScore)} to finish the game.`);
      return;
    }
    setError(null);
    onSubmit(`${String(s1)},${String(s2)}`);
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Game score">
      <Stack spacing={1}>
        <Input
          label={team1Label}
          type="number"
          value={team1}
          onChange={(event) => {
            setTeam1(event.target.value);
          }}
          slotProps={{ htmlInput: { min: 0 } }}
        />
        <Input
          label={team2Label}
          type="number"
          value={team2}
          onChange={(event) => {
            setTeam2(event.target.value);
          }}
          slotProps={{ htmlInput: { min: 0 } }}
        />
        {error !== null ? <Alert severity="error">{error}</Alert> : null}
        <Button type="submit" disabled={disabled}>
          Submit score
        </Button>
      </Stack>
    </form>
  );
}
