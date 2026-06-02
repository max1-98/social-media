import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { eventsApi, ApiRequestError } from "../api";
import type { CreateEventPayload } from "../api";
import { Alert, Button, Input, Select, Text } from "../components/atoms";
import type { SelectOption } from "../components/atoms";
import { PageLayout } from "../components/templates";

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

/**
 * Page: create an event under a club. Mirrors the legacy CreateEvent form
 * (game type, date/time, courts, SBMM, guests, age group), POSTs to
 * `/api/event/create/:clubId`, then navigates to the new event.
 *
 * Intended route: `/club/:clubId/event/create` (authenticated, club admin).
 */
export function CreateEventPage(): ReactElement {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [gameType, setGameType] = useState("badminton singles");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [finishTime, setFinishTime] = useState("");
  const [courts, setCourts] = useState("1");
  const [sbmm, setSbmm] = useState(true);
  const [guestsAllowed, setGuestsAllowed] = useState(false);
  const [ageGroup, setAgeGroup] = useState("all ages");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (clubId === undefined) return;
    setError(null);
    setSubmitting(true);
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
    try {
      const created = await eventsApi.createEvent(clubId, payload);
      void navigate(`/club/${clubId}/event/${String(created.id)}`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create the event.");
      setSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <Text variant="h1" gutterBottom>
        Create event
      </Text>
      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        aria-label="Create event"
      >
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          {error !== null ? <Alert severity="error">{error}</Alert> : null}
          <Select
            label="Game type"
            options={GAME_TYPES}
            value={gameType}
            onChange={(event) => {
              setGameType(event.target.value);
            }}
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
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
            {submitting ? "Creating…" : "Create event"}
          </Button>
        </Stack>
      </form>
    </PageLayout>
  );
}
