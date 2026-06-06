import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { Fixture, FixtureStatus } from "../../types";
import { Button, Chip, Text } from "../atoms";

/** MUI palette colour used for each fixture status' chip. */
type ChipColor = "default" | "info" | "success" | "warning" | "error" | "primary";

const STATUS_COLOUR: Record<FixtureStatus, ChipColor> = {
  proposed: "info",
  accepted: "primary",
  declined: "error",
  cancelled: "default",
  played: "warning",
  confirmed: "success",
};

const STATUS_LABEL: Record<FixtureStatus, string> = {
  proposed: "Proposed",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
  played: "Played",
  confirmed: "Confirmed",
};

export interface FixtureCardProps {
  /** The fixture to display. */
  fixture: Fixture;
  /**
   * Whether the viewer is an admin of the away club and may respond to a
   * proposal (accept / decline). Drives the accept/decline actions.
   */
  canRespond?: boolean;
  /**
   * Whether the viewer is an admin of either club and may manage the fixture
   * (cancel it, record a result, confirm a played result).
   */
  canManage?: boolean;
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
 * Molecule: one club-vs-club fixture as a card — the two club names, date, a
 * status chip, and the actions valid for the current status and viewer. Pure
 * presentation: the page owns the `api` calls and passes callbacks (mirrors
 * {@link MemberRow}).
 */
export function FixtureCard({
  fixture,
  canRespond = false,
  canManage = false,
  onAccept,
  onDecline,
  onCancel,
  onRecordResult,
  onConfirm,
}: FixtureCardProps): ReactElement {
  const { status } = fixture;
  const matchup = `${fixture.home_club_name} vs ${fixture.away_club_name}`;

  return (
    <Card variant="outlined" aria-label={matchup}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Text variant="subtitle1">{matchup}</Text>
            <Text variant="body2" color="text.secondary">
              {fixture.game_type_name ?? "Any game type"} · {fixture.date ?? "Date TBC"}
            </Text>
          </Stack>
          <Chip color={STATUS_COLOUR[status]} label={STATUS_LABEL[status]} size="small" />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
          {canRespond && status === "proposed" && (
            <>
              <Button onClick={() => onAccept?.(fixture)} aria-label={`Accept fixture ${matchup}`}>
                Accept
              </Button>
              <Button
                onClick={() => onDecline?.(fixture)}
                aria-label={`Decline fixture ${matchup}`}
              >
                Decline
              </Button>
            </>
          )}
          {canManage && status === "accepted" && (
            <Button
              onClick={() => onRecordResult?.(fixture)}
              aria-label={`Record result for ${matchup}`}
            >
              Record result
            </Button>
          )}
          {canManage && status === "played" && (
            <Button
              onClick={() => onConfirm?.(fixture)}
              aria-label={`Confirm result for ${matchup}`}
            >
              Confirm result
            </Button>
          )}
          {canManage && (status === "proposed" || status === "accepted") && (
            <Button onClick={() => onCancel?.(fixture)} aria-label={`Cancel fixture ${matchup}`}>
              Cancel
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
