import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import { useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { clubsApi, eventsApi, ApiRequestError } from "../api";
import type { CreateEventPayload, CreateSeriesPayload } from "../api";
import { Alert, Button, Input, Select, Text } from "../components/atoms";
import type { SelectOption } from "../components/atoms";
import type { MyClub, RecurrenceFrequency } from "../types";

const GAME_TYPES: SelectOption[] = [
  { value: "badminton singles", label: "Badminton Singles" },
  { value: "badminton doubles", label: "Badminton Doubles" },
  { value: "tennis singles", label: "Tennis Singles" },
  { value: "tennis doubles", label: "Tennis Doubles" },
  { value: "paddle singles", label: "Paddle Singles" },
  { value: "paddle doubles", label: "Paddle Doubles" },
];

const AGE_GROUPS: SelectOption[] = [
  { value: "all ages", label: "All ages" },
  { value: "over_18", label: "Over 18" },
  { value: "under_18", label: "Under 18" },
];

const REPEAT_OPTIONS: SelectOption[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

type Repeat = "none" | RecurrenceFrequency;

/**
 * Page: create an event (or a recurring series) under a club. When the route
 * supplies `:clubId` the club is fixed; otherwise (from `/event/create`) the
 * admin picks one of the clubs they administer. A non-"none" "Repeats" choice
 * POSTs a series to `/api/event/series/create/:clubId`; otherwise a single event
 * to `/api/event/create/:clubId`. Both are admin-gated by the backend.
 *
 * Intended routes: `/club/:clubId/event/create` and `/event/create`.
 */
export function CreateEventPage(): ReactElement {
  const { clubId: routeClubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const needsClubPicker = routeClubId === undefined;

  const [adminClubs, setAdminClubs] = useState<MyClub[] | null>(null);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [gameType, setGameType] = useState("badminton singles");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [repeat, setRepeat] = useState<Repeat>("none");
  const [interval, setInterval] = useState("1");
  const [startTime, setStartTime] = useState("");
  const [finishTime, setFinishTime] = useState("");
  const [courts, setCourts] = useState("1");
  const [sbmm, setSbmm] = useState(true);
  const [guestsAllowed, setGuestsAllowed] = useState(false);
  const [ageGroup, setAgeGroup] = useState("all ages");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!needsClubPicker) return;
    let active = true;
    void clubsApi
      .myClubs()
      .then((clubs) => {
        if (active) setAdminClubs(clubs.filter((club) => club.is_club_admin));
      })
      .catch(() => {
        if (active) setAdminClubs([]);
      });
    return () => {
      active = false;
    };
  }, [needsClubPicker]);

  const clubId = routeClubId ?? selectedClubId;

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (clubId === "") {
      setError("Please choose a club.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (repeat === "none") {
        const payload: CreateEventPayload = {
          game_type: gameType,
          date,
          start_time: startTime,
          finish_time: finishTime,
          number_of_courts: Number.parseInt(courts, 10) || 1,
          sbmm,
          guests_allowed: guestsAllowed,
          over_18_under_18_mixed: ageGroup,
        };
        const created = await eventsApi.createEvent(clubId, payload);
        void navigate(`/club/${clubId}/event/${created.id}`);
      } else {
        const payload: CreateSeriesPayload = {
          game_type: gameType,
          start_time: startTime,
          finish_time: finishTime,
          number_of_courts: Number.parseInt(courts, 10) || 1,
          sbmm,
          guests_allowed: guestsAllowed,
          over_18_under_18_mixed: ageGroup,
          frequency: repeat,
          interval: Number.parseInt(interval, 10) || 1,
          start_date: date,
          end_date: endDate,
        };
        await eventsApi.createSeries(clubId, payload);
        void navigate(`/club/${clubId}/events`);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create the event.");
      setSubmitting(false);
    }
  }

  if (needsClubPicker && adminClubs !== null && adminClubs.length === 0) {
    return (
      <Stack spacing={3}>
        <Text variant="h1">Create event</Text>
        <Alert severity="info">
          You need to be an admin of a club to create events. None of your clubs qualify.
        </Alert>
      </Stack>
    );
  }

  const clubOptions: SelectOption[] = (adminClubs ?? []).map((club) => ({
    value: club.id,
    label: club.name,
  }));
  const recurring = repeat !== "none";

  return (
    <Stack spacing={3}>
      <Text variant="h1">Create event</Text>
      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        aria-label="Create event"
      >
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          {error !== null ? <Alert severity="error">{error}</Alert> : null}
          {needsClubPicker ? (
            <Select
              label="Club"
              options={clubOptions}
              value={selectedClubId}
              onChange={(event) => {
                setSelectedClubId(event.target.value);
              }}
            />
          ) : null}
          <Select
            label="Game type"
            options={GAME_TYPES}
            value={gameType}
            onChange={(event) => {
              setGameType(event.target.value);
            }}
          />
          <Select
            label="Repeats"
            options={REPEAT_OPTIONS}
            value={repeat}
            onChange={(event) => {
              setRepeat(event.target.value as Repeat);
            }}
          />
          <Input
            label={recurring ? "First date" : "Date"}
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          {recurring ? (
            <>
              <Input
                label="Repeat every (intervals)"
                type="number"
                value={interval}
                onChange={(event) => {
                  setInterval(event.target.value);
                }}
                slotProps={{ htmlInput: { min: 1 } }}
                required
              />
              <Input
                label="Repeat until"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                required
              />
            </>
          ) : null}
          <Input
            label="Start time"
            type="time"
            value={startTime}
            onChange={(event) => {
              setStartTime(event.target.value);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          <Input
            label="Finish time"
            type="time"
            value={finishTime}
            onChange={(event) => {
              setFinishTime(event.target.value);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          <Input
            label="Number of courts"
            type="number"
            value={courts}
            onChange={(event) => {
              setCourts(event.target.value);
            }}
            slotProps={{ htmlInput: { min: 1 } }}
            required
          />
          <FormControlLabel
            control={
              <Switch
                checked={sbmm}
                onChange={(event) => {
                  setSbmm(event.target.checked);
                }}
              />
            }
            label="Skill-based matchmaking"
          />
          <FormControlLabel
            control={
              <Switch
                checked={guestsAllowed}
                onChange={(event) => {
                  setGuestsAllowed(event.target.checked);
                }}
              />
            }
            label="Guests allowed"
          />
          <Select
            label="Age groups allowed"
            options={AGE_GROUPS}
            value={ageGroup}
            onChange={(event) => {
              setAgeGroup(event.target.value);
            }}
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : recurring ? "Create series" : "Create event"}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
