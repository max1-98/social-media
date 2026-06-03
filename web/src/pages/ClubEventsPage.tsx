import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { clubsApi, eventsApi, ApiRequestError } from "../api";
import { Alert, Button, Spinner, Text } from "../components/atoms";
import { EventList } from "../components/organisms";
import type { Event } from "../types";

/**
 * Page: all events for a single club, grouped into active/upcoming/past, with a
 * link to create a new one. Selecting an event opens its detail view.
 *
 * Intended route: `/club/:clubId/events` (authenticated).
 */
export function ClubEventsPage(): ReactElement {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clubId === undefined) return;
    let active = true;
    eventsApi
      .clubEvents(clubId)
      .then((data) => {
        if (active) setEvents(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof ApiRequestError ? err.message : "Could not load club events.");
        }
      });
    void clubsApi
      .clubDetail(clubId)
      .then((club) => {
        if (active) setIsAdmin(club.is_club_admin);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [clubId]);

  return (
    <Stack spacing={3}>
      <Text variant="h1">Club events</Text>
      {clubId !== undefined && isAdmin ? (
        <Box>
          <Button
            onClick={() => {
              void navigate(`/club/${clubId}/event/create`);
            }}
          >
            Create event
          </Button>
        </Box>
      ) : null}
      {error !== null ? <Alert severity="error">{error}</Alert> : null}
      {events === null && error === null ? (
        <Spinner />
      ) : events !== null ? (
        <EventList
          events={events}
          onSelectEvent={(event) => {
            void navigate(`/club/${event.club.id}/event/${event.id}`);
          }}
        />
      ) : null}
    </Stack>
  );
}
