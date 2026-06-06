import Stack from "@mui/material/Stack";
import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useParams } from "react-router-dom";

import { clubsApi, eventsApi, gamesApi, ApiRequestError } from "../api";
import { Alert, Spinner, Text } from "../components/atoms";
import { EventComplete, EventPending, MatchmakingPanel } from "../components/organisms";
import type { CompleteGame, EventDetail, EventStatsResult, Game, MemberEvent } from "../types";

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.message : fallback;
}

/**
 * Page: the full event view. Loads the event detail, club members, in-progress
 * games, completed games and (when complete) stats, then renders the matching
 * lifecycle organism: pending → matchmaking → complete. Wires `eventsApi`,
 * `gamesApi`, `clubsApi` and the current user's admin status.
 *
 * Intended route: `/club/:clubId/event/:eventId` (authenticated).
 */
export function EventViewPage(): ReactElement {
  const { clubId, eventId } = useParams<{ clubId: string; eventId: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [members, setMembers] = useState<MemberEvent[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [completedGames, setCompletedGames] = useState<CompleteGame[]>([]);
  const [stats, setStats] = useState<EventStatsResult | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshEvent = useCallback(async (): Promise<void> => {
    if (eventId === undefined) return;
    setEvent(await eventsApi.eventDetail(eventId));
  }, [eventId]);

  const refreshGames = useCallback(async (): Promise<void> => {
    if (eventId === undefined) return;
    setGames(await gamesApi.eventIncompleteGames(eventId));
  }, [eventId]);

  const refreshMembers = useCallback(async (): Promise<void> => {
    if (eventId === undefined) return;
    setMembers(await clubsApi.clubMembersForEvent(eventId));
  }, [eventId]);

  useEffect(() => {
    if (clubId === undefined || eventId === undefined) return;
    let active = true;
    setLoading(true);
    Promise.all([
      eventsApi.eventDetail(eventId),
      clubsApi.clubDetail(clubId),
      clubsApi.clubMembersForEvent(eventId),
      gamesApi.eventIncompleteGames(eventId),
      gamesApi.eventCompleteGames(eventId),
    ])
      .then(([detail, club, clubMembers, incomplete, complete]) => {
        if (!active) return;
        setEvent(detail);
        setIsAdmin(club.is_club_admin);
        setMembers(clubMembers);
        setGames(incomplete);
        setCompletedGames(complete);
      })
      .catch((err: unknown) => {
        if (active) setError(messageOf(err, "Could not load the event."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clubId, eventId]);

  // Lazy-load stats only once the event is complete (mirrors the legacy effect).
  useEffect(() => {
    if (eventId === undefined || !event?.event_complete) return;
    let active = true;
    eventsApi
      .eventStats(eventId)
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(() => {
        /* stats are best-effort; the page still renders the games list */
      });
    return () => {
      active = false;
    };
  }, [eventId, event]);

  function runAction(action: () => Promise<unknown>, after: () => Promise<void>): void {
    setActionError(null);
    action()
      .then(() => after())
      .catch((err: unknown) => {
        setActionError(messageOf(err, "That action failed. Please try again."));
      });
  }

  if (loading) {
    return <Spinner />;
  }

  if (event === null) {
    return <Alert severity="error">{error ?? "Event not found."}</Alert>;
  }

  const numericEventId = event.id;

  return (
    <Stack spacing={3}>
      <Text variant="h1">{event.game_type.name}</Text>
      {error !== null ? <Alert severity="error">{error}</Alert> : null}

      {!event.event_active ? (
        <EventPending
          event={event}
          isAdmin={isAdmin}
          onStart={() => {
            runAction(() => eventsApi.startEvent(numericEventId), refreshEvent);
          }}
        />
      ) : null}

      {event.event_active && !event.event_complete ? (
        <MatchmakingPanel
          event={event}
          games={games}
          isAdmin={isAdmin}
          members={members}
          error={actionError}
          onCreateGame={() => {
            const create =
              event.mode === "social"
                ? () => gamesApi.createSocial(numericEventId)
                : () => gamesApi.createSbmm(numericEventId);
            runAction(create, async () => {
              await Promise.all([refreshGames(), refreshEvent()]);
            });
          }}
          onCompleteEvent={() => {
            runAction(() => eventsApi.completeEvent(numericEventId), refreshEvent);
          }}
          onChangeSelectionMode={(mode) => {
            runAction(() => eventsApi.updateSettings(numericEventId, { mode }), refreshEvent);
          }}
          onSubmitScore={(gameId, score) => {
            runAction(
              () => gamesApi.completeGame({ game_id: gameId, event_id: numericEventId, score }),
              async () => {
                await Promise.all([refreshGames(), refreshEvent()]);
              },
            );
          }}
          onDeleteGame={(gameId) => {
            runAction(
              () => gamesApi.deleteGame(gameId),
              async () => {
                await Promise.all([refreshGames(), refreshEvent()]);
              },
            );
          }}
          onPausePlayer={(gameId, memberId) => {
            runAction(
              async () => {
                await gamesApi.deleteGame(gameId);
                await eventsApi.deactivateMember(numericEventId, memberId);
              },
              async () => {
                await Promise.all([refreshGames(), refreshEvent()]);
              },
            );
          }}
          onActivateMember={(memberId) => {
            runAction(() => eventsApi.activateMember(numericEventId, memberId), refreshEvent);
          }}
          onDeactivateMember={(memberId) => {
            runAction(() => eventsApi.deactivateMember(numericEventId, memberId), refreshEvent);
          }}
          onCreateDummyUser={async (draft) => {
            if (clubId === undefined) return;
            const created = await clubsApi.createDummyUser(clubId, draft);
            await eventsApi.activateMember(numericEventId, created.id);
            await Promise.all([refreshMembers(), refreshEvent()]);
          }}
          onInviteMember={async (userId) => {
            await eventsApi.inviteMember(numericEventId, userId);
            await Promise.all([refreshMembers(), refreshEvent()]);
          }}
          onSearchUsers={(q, page) => {
            if (clubId === undefined)
              return Promise.resolve({ results: [], page, has_next: false });
            return clubsApi.searchUsers(clubId, q, page);
          }}
        />
      ) : null}

      {event.event_active && event.event_complete ? (
        <EventComplete
          stats={stats}
          completedGames={completedGames}
          isAdmin={isAdmin}
          onReactivate={() => {
            runAction(() => eventsApi.completeEvent(numericEventId), refreshEvent);
          }}
        />
      ) : null}
    </Stack>
  );
}
