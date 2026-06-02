import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";

import { eventsApi, ApiRequestError } from "../api";
import { Alert, Spinner, Text } from "../components/atoms";
import { EventList } from "../components/organisms";
import { PageLayout } from "../components/templates";
import type { Event } from "../types";

/**
 * Page: the signed-in user's events across all their clubs, grouped into
 * active/upcoming/past. Selecting an event opens its detail view.
 *
 * Intended route: `/events` (authenticated).
 */
export function MyEventsPage(): ReactElement {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    eventsApi
      .myEvents()
      .then((data) => {
        if (active) setEvents(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof ApiRequestError ? err.message : "Could not load your events.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageLayout>
      <Text variant="h1" gutterBottom>
        My events
      </Text>
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
