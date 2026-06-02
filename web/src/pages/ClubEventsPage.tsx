import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { eventsApi, ApiRequestError } from "../api";
import { Alert, Button, Spinner, Text } from "../components/atoms";
import { EventList } from "../components/organisms";
import { PageLayout } from "../components/templates";
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
    return () => {
      active = false;
    };
  }, [clubId]);

  return (
    <PageLayout>
      <Text variant="h1" gutterBottom>
        Club events
      </Text>
      {clubId !== undefined ? (
        <Button
          onClick={() => {
            void navigate(`/club/${clubId}/event/create`);
          }}
        >
          Create event
        </Button>
      ) : null}
      {error !== null ? <Alert severity="error">{error}</Alert> : null}
      {events === null && error === null ? (
        <Spinner />
      ) : events !== null ? (
        <EventList
          events={events}
          onSelectEvent={(event) => {
            void navigate(`/club/${String(event.club.id)}/event/${String(event.id)}`);
          }}
        />
      ) : null}
    </PageLayout>
  );
}
