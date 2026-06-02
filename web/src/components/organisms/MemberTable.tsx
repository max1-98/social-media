import List from "@mui/material/List";
import type { ReactElement } from "react";

import type { Member } from "../../types";
import { Text } from "../atoms";
import { MemberRow } from "../molecules";

export interface MemberTableProps {
  /** The club's members. */
  members: Member[];
  /** Whether the viewer is the club president (may promote/demote admins). */
  isPresident?: boolean;
  /** Whether the viewer is a club admin (may remove members). */
  isAdmin?: boolean;
  /** Promote a member to admin. */
  onPromote?: (member: Member) => void;
  /** Demote an admin. */
  onDemote?: (member: Member) => void;
  /** Remove a member from the club. */
  onRemove?: (member: Member) => void;
}

/**
 * Organism: the club member roster. Renders a {@link MemberRow} per member and
 * exposes admin actions (promote/demote/remove) as callbacks. Pure presentation
 * — the page wires `clubsApi` and refetches after a mutation.
 */
export function MemberTable({
  members,
  isPresident = false,
  isAdmin = false,
  onPromote,
  onDemote,
  onRemove,
}: MemberTableProps): ReactElement {
  if (members.length === 0) {
    return <Text>This club has no members yet.</Text>;
  }

  return (
    <List aria-label="Club members">
      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          canManageAdmins={isPresident}
          canRemove={isAdmin}
          {...(onPromote ? { onPromote } : {})}
          {...(onDemote ? { onDemote } : {})}
          {...(onRemove ? { onRemove } : {})}
        />
      ))}
    </List>
  );
}
