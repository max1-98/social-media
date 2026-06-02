import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { Event } from "../../types";
import { Avatar, Badge, Text } from "../atoms";

export interface EventListProps {
  /** Events to display (any lifecycle). Grouped into active/upcoming/past. */
  events: Event[];
  /** Called with the chosen event when a card is activated. */
  onSelectEvent: (event: Event) => void;
}

interface Group {
  key: string;
  title: string;
  events: Event[];
  emptyText: string;
}

function statusLabel(event: Event): string {
  if (event.event_complete) return "Complete";
  if (event.event_active) return "Active";
  return "Upcoming";
}

function groupEvents(events: Event[]): Group[] {
  const active = events.filter((e) => e.event_active && !e.event_complete);
  const upcoming = events.filter((e) => !e.event_active);
  const past = events.filter((e) => e.event_active && e.event_complete);
  return [
    { key: "active", title: "Active events", events: active, emptyText: "No active events." },
    {
      key: "upcoming",
      title: "Upcoming events",
      events: upcoming,
      emptyText: "No upcoming events.",
    },
    { key: "past", title: "Past events", events: past, emptyText: "No past events." },
  ];
}

function EventCard({
  event,
  onSelect,
}: {
  event: Event;
  onSelect: (event: Event) => void;
}): ReactElement {
  return (
    <Card variant="outlined">
      <CardActionArea
        onClick={() => {
          onSelect(event);
        }}
        aria-label={`${event.club.name} ${event.game_type.name} on ${event.date}`}
      >
        <CardContent>
          <Stack spacing={1} sx={{ flexDirection: "row", alignItems: "center" }}>
            <Avatar src={event.club.logo} alt={event.club.name} />
            <Stack>
              <Text variant="subtitle1">{event.club.name}</Text>
              <Text variant="body2">{event.game_type.name}</Text>
              <Text variant="body2">
                {event.date} · {event.start_time}–{event.finish_time}
              </Text>
            </Stack>
            <Badge color="primary" badgeContent={statusLabel(event)} sx={{ ml: "auto" }} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

/**
 * Organism: lists a set of events, grouped into Active / Upcoming / Past (the
 * legacy MyEvents/Events split). Each card is a button that calls
 * `onSelectEvent`; the page decides where to navigate. Pure presentation — no
 * `api`/`hooks` imports.
 */
export function EventList({ events, onSelectEvent }: EventListProps): ReactElement {
  const groups = groupEvents(events);
  return (
    <Stack spacing={3}>
      {groups.map((group) => (
        <section key={group.key} aria-label={group.title}>
          <Text variant="h6" gutterBottom>
            {group.title}
          </Text>
          {group.events.length > 0 ? (
            <Stack spacing={1}>
              {group.events.map((event) => (
                <EventCard key={event.id} event={event} onSelect={onSelectEvent} />
              ))}
            </Stack>
          ) : (
            <Text variant="body2">{group.emptyText}</Text>
          )}
        </section>
      ))}
    </Stack>
  );
}
