import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import type { MemberRequest } from "../../types";
import { Button, Text } from "../atoms";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}

export interface ClubRequestsProps {
  /** Pending join requests for the club. */
  requests: MemberRequest[];
  /** Accept a request (admit the user). */
  onAccept?: (request: MemberRequest) => void;
  /** Reject a request (decline the user). */
  onReject?: (request: MemberRequest) => void;
}

/**
 * Organism: the club's pending join requests with accept/reject actions exposed
 * as callbacks. Pure presentation — the page wires `clubsApi` and refetches.
 */
export function ClubRequests({ requests, onAccept, onReject }: ClubRequestsProps): ReactElement {
  if (requests.length === 0) {
    return <Text>There are no member requests currently.</Text>;
  }

  return (
    <List aria-label="Member requests">
      {requests.map((request) => (
        <ListItem key={request.id} divider>
          <ListItemText
            primary={request.username}
            secondary={`Requested on ${formatDate(request.date_requested)}`}
          />
          <Stack direction="row" spacing={1}>
            <Button onClick={() => onAccept?.(request)}>Accept</Button>
            <Button onClick={() => onReject?.(request)}>Decline</Button>
          </Stack>
        </ListItem>
      ))}
    </List>
  );
}
