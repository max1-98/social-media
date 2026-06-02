import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { ManyClub } from "../../types";
import { Avatar, SportIcon, Text } from "../atoms";
import type { SportName } from "../atoms";

const KNOWN_SPORTS: readonly SportName[] = [
  "football",
  "basketball",
  "tennis",
  "padel",
  "hockey",
  "rugby",
  "volleyball",
  "badminton",
  "pool",
  "snooker",
];

function toSportName(name: string): SportName | null {
  const lower = name.toLowerCase();
  return KNOWN_SPORTS.find((s) => s === lower) ?? null;
}

function attendanceLabel(value: number | string): string {
  return typeof value === "number" ? `Avg. attendance ${String(Math.ceil(value))}` : value;
}

export interface ClubCardProps {
  /** The club to summarise. */
  club: ManyClub;
  /** Called when the card is activated (navigate to the club's detail page). */
  onSelect?: (id: number) => void;
}

/**
 * Organism: a discover-grid summary of a club — logo, name, handle, info blurb,
 * sport glyph and status chips (active, upcoming events, average attendance).
 * Takes data + an `onSelect` callback; the page owns navigation and fetching.
 */
export function ClubCard({ club, onSelect }: ClubCardProps): ReactElement {
  const sport = toSportName(club.sport_type.name);

  const content = (
    <Stack spacing={1} sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Avatar src={club.logo || undefined} alt={`${club.name} logo`}>
          {club.name.charAt(0)}
        </Avatar>
        <div>
          <Text variant="subtitle1">{club.name}</Text>
          <Text variant="caption" color="text.secondary">
            @{club.club_username}
          </Text>
        </div>
      </Stack>
      {club.info ? (
        <Text variant="body2" color="text.secondary">
          {club.info}
        </Text>
      ) : null}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        {sport ? (
          <SportIcon sport={sport} title={`${club.sport_type.name} club`} />
        ) : (
          <Text variant="caption">{club.sport_type.name || "No sport"}</Text>
        )}
        <Chip
          size="small"
          variant="outlined"
          color={club.is_active ? "success" : "error"}
          label={club.is_active ? "Active" : "Inactive"}
        />
        <Chip
          size="small"
          variant="outlined"
          color={club.is_event_upcoming ? "success" : "default"}
          label={club.is_event_upcoming ? "Upcoming events" : "No events"}
        />
        <Chip
          size="small"
          variant="outlined"
          color="secondary"
          label={attendanceLabel(club.average_attendance)}
        />
      </Stack>
    </Stack>
  );

  return (
    <Card>
      {onSelect ? (
        <CardActionArea
          onClick={() => {
            onSelect(club.id);
          }}
          aria-label={`View ${club.name}`}
        >
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
}
