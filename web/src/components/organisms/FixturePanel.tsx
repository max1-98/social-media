import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import type { Fixture } from "../../types";
import { Alert, Button, Input, Text } from "../atoms";
import { FixtureCard } from "../molecules";

/** The propose-fixture form draft (all ids are opaque strings on the wire). */
export interface ProposeFixtureDraft {
  /** Opaque id of the away club to challenge. */
  awayClub: string;
  /** Optional game-type name; the backend resolves it to an id. */
  gameType?: string;
  /** Optional ISO date for the fixture. */
  date?: string;
}

export interface FixturePanelProps {
  /** The club's fixtures (home or away). */
  fixtures: Fixture[];
  /** Whether the viewer is a club admin (may propose / manage fixtures). */
  isAdmin?: boolean;
  /**
   * The opaque id of the club this panel belongs to. Used to decide which side
   * of each fixture the viewer is on (so the away club can accept / decline).
   */
  clubId: string;
  /** Propose a new fixture. The page wires this to `fixturesApi.proposeFixture`. */
  onPropose?: (draft: ProposeFixtureDraft) => Promise<void>;
  /** Accept a proposed fixture (away club). */
  onAccept?: (fixture: Fixture) => void;
  /** Decline a proposed fixture (away club). */
  onDecline?: (fixture: Fixture) => void;
  /** Cancel the fixture (either club). */
  onCancel?: (fixture: Fixture) => void;
  /** Open the result-recording flow for an accepted fixture. */
  onRecordResult?: (fixture: Fixture) => void;
  /** Confirm a played fixture's recorded result. */
  onConfirm?: (fixture: Fixture) => void;
}

/**
 * Organism: a club's fixtures schedule. Renders a {@link FixtureCard} per
 * fixture (with the actions valid for the viewer and the fixture's status) and,
 * for admins, a small "propose fixture" form. Pure presentation — the page owns
 * the `fixturesApi` calls and refetches after a mutation (mirrors
 * {@link MemberTable}).
 */
export function FixturePanel({
  fixtures,
  isAdmin = false,
  clubId,
  onPropose,
  onAccept,
  onDecline,
  onCancel,
  onRecordResult,
  onConfirm,
}: FixturePanelProps): ReactElement {
  const [awayClub, setAwayClub] = useState("");
  const [gameType, setGameType] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handlePropose(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (onPropose === undefined) return;
    if (awayClub.trim() === "") {
      setError("Enter the away club's id to challenge.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onPropose({
        awayClub: awayClub.trim(),
        ...(gameType.trim() === "" ? {} : { gameType: gameType.trim() }),
        ...(date === "" ? {} : { date }),
      });
      setAwayClub("");
      setGameType("");
      setDate("");
    } catch {
      setError("We could not propose that fixture. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack spacing={2}>
      {isAdmin && onPropose !== undefined && (
        <form onSubmit={(event) => void handlePropose(event)} aria-label="Propose fixture">
          <Stack spacing={2}>
            {error !== null && <Alert severity="error">{error}</Alert>}
            <Input
              label="Away club id"
              value={awayClub}
              onChange={(event) => {
                setAwayClub(event.target.value);
              }}
              fullWidth
            />
            <Input
              label="Game type"
              value={gameType}
              onChange={(event) => {
                setGameType(event.target.value);
              }}
              fullWidth
            />
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? "Proposing…" : "Propose fixture"}
            </Button>
          </Stack>
          <Divider sx={{ mt: 2 }} />
        </form>
      )}

      {fixtures.length === 0 ? (
        <Text>No fixtures scheduled yet.</Text>
      ) : (
        <Stack spacing={2} aria-label="Club fixtures">
          {fixtures.map((fixture) => (
            <FixtureCard
              key={fixture.id}
              fixture={fixture}
              canRespond={isAdmin && fixture.away_club === clubId}
              canManage={isAdmin}
              {...(onAccept ? { onAccept } : {})}
              {...(onDecline ? { onDecline } : {})}
              {...(onCancel ? { onCancel } : {})}
              {...(onRecordResult ? { onRecordResult } : {})}
              {...(onConfirm ? { onConfirm } : {})}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
