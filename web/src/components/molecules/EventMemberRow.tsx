import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { MemberEvent } from "../../types";
import { Avatar, Button, Chip } from "../atoms";

export interface EventMemberRowProps {
  /** The event member to render (carries the event's game-type ELO). */
  member: MemberEvent;
  /** The single action's label, e.g. "Activate" or "Deactivate". */
  actionLabel: string;
  /** Invoked with the member id when the action button is clicked. */
  onAction: (memberId: string) => void;
}

/** Full display name, falling back to the username when names are missing. */
export function memberName(member: MemberEvent): string {
  return `${member.first_name} ${member.surname}`.trim() || member.username;
}

/** Up to two uppercase initials for the avatar, derived from the display name. */
export function memberInitials(member: MemberEvent): string {
  const parts = memberName(member).split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/**
 * Molecule: one event member as a list row — initials avatar, full name and
 * `@username`, an ELO pill (amber `energy` chip, or an outlined "Unranked" chip
 * when the member has no rating yet) and a single activate/deactivate action.
 * Pure presentation: the page owns the mutation behind `onAction`.
 */
export function EventMemberRow({
  member,
  actionLabel,
  onAction,
}: EventMemberRowProps): ReactElement {
  const name = memberName(member);
  const isActivate = actionLabel.toLowerCase() === "activate";
  return (
    <ListItem
      divider
      secondaryAction={
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {member.elo === null ? (
            <Chip size="small" variant="outlined" label="Unranked" />
          ) : (
            <Chip
              size="small"
              label={String(member.elo)}
              sx={{ bgcolor: "energy.main", color: "energy.contrastText", fontWeight: 700 }}
            />
          )}
          <Button
            size="small"
            variant={isActivate ? "contained" : "text"}
            color={isActivate ? "success" : "error"}
            aria-label={`${actionLabel} ${name}`}
            onClick={() => {
              onAction(member.id);
            }}
          >
            {actionLabel}
          </Button>
        </Stack>
      }
    >
      <ListItemAvatar>
        <Avatar sx={{ width: 32, height: 32, fontSize: "0.8rem" }}>{memberInitials(member)}</Avatar>
      </ListItemAvatar>
      <ListItemText primary={name} secondary={`@${member.username}`} />
    </ListItem>
  );
}
