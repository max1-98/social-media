import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { EventDetail } from "../../types";
import { Button, Text } from "../atoms";

export interface EventPendingProps {
  /** The not-yet-started event. */
  event: EventDetail;
  /** Whether the viewer can start the event (admin). */
  isAdmin: boolean;
  /** Start the event (`POST /api/event/start`). */
  onStart: () => void;
}

/**
 * Organism: the pre-start state of an event. Shows the event summary and, for
 * admins, a "Start event" button. Pure presentation — the page owns the API
 * call behind `onStart`.
 */
export function EventPending({ event, isAdmin, onStart }: EventPendingProps): ReactElement {
  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
        <Text variant="h5">{event.game_type.name}</Text>
        <Text variant="body2">
          {event.date} · {event.start_time}–{event.finish_time}
        </Text>
        <Text variant="body2">Courts: {event.number_of_courts}</Text>
        {isAdmin ? (
          <Button onClick={onStart}>Start event</Button>
        ) : (
          <Text variant="body2">This event has not started yet.</Text>
        )}
      </Stack>
    </Paper>
  );
}
