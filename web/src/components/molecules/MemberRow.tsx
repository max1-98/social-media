import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { Member } from "../../types";
import { Badge, Button } from "../atoms";

export interface MemberRowProps {
  /** The club member to render. */
  member: Member;
  /**
   * Whether the viewer may promote/demote admins (club president). When false
   * the admin toggle is hidden; the remove action is governed by `canRemove`.
   */
  canManageAdmins?: boolean;
  /** Whether the viewer may remove this member (club admin). */
  canRemove?: boolean;
  /** Promote the member to admin. */
  onPromote?: (member: Member) => void;
  /** Demote the member from admin. */
  onDemote?: (member: Member) => void;
  /** Remove the member from the club. */
  onRemove?: (member: Member) => void;
}

/**
 * Molecule: a single club member as a list row — full name, an "Admin" badge
 * when applicable, and (for privileged viewers) promote/demote and remove
 * actions. Stays free of the `api`/`hooks` layers; the page passes callbacks.
 */
export function MemberRow({
  member,
  canManageAdmins = false,
  canRemove = false,
  onPromote,
  onDemote,
  onRemove,
}: MemberRowProps): ReactElement {
  const fullName = `${member.first_name} ${member.surname}`.trim() || member.username;

  return (
    <ListItem divider>
      <ListItemText
        primary={
          member.is_club_admin ? (
            <Badge
              color="success"
              badgeContent="Admin"
              sx={{ "& .MuiBadge-badge": { position: "static", transform: "none", ml: 1 } }}
            >
              {fullName}
            </Badge>
          ) : (
            fullName
          )
        }
        secondary={`@${member.username}`}
      />
      <Stack direction="row" spacing={1}>
        {canManageAdmins && !member.is_club_admin && (
          <Button onClick={() => onPromote?.(member)}>Make admin</Button>
        )}
        {canManageAdmins && member.is_club_admin && (
          <Button onClick={() => onDemote?.(member)}>Remove admin</Button>
        )}
        {canRemove && <Button onClick={() => onRemove?.(member)}>Remove</Button>}
      </Stack>
    </ListItem>
  );
}
