import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useNavigate } from "react-router-dom";

import { ApiRequestError, clubsApi } from "../api";
import { Alert, Button, Input, Select, Text } from "../components/atoms";
import type { Sport } from "../types";

/**
 * Page — route `/createclub`. Create a new club (name, handle, sport, info) via
 * `clubsApi.createClub`, then navigate to the new club's detail page. The
 * backend caps `club_username` length and rejects long handles with a 400.
 */
export function CreateClubPage(): ReactElement {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [clubUsername, setClubUsername] = useState("");
  const [sportType, setSportType] = useState("");
  const [info, setInfo] = useState("");
  const [sports, setSports] = useState<Sport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    clubsApi
      .listSports()
      .then((data) => {
        if (active) setSports(data);
      })
      .catch(() => {
        // Sports are non-critical to render the form; ignore load errors here.
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const club = await clubsApi.createClub({
        name,
        club_username: clubUsername,
        ...(info ? { info } : {}),
      });
      if (sportType) {
        await clubsApi.addSport({ club_id: club.id, sport_name: sportType });
      }
      void navigate(`/club/${String(club.id)}`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create the club.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Text variant="h1">Create a club</Text>
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          {error !== null && <Alert severity="error">{error}</Alert>}
          <Input
            label="Name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            required
          />
          <Input
            label="Club handle"
            value={clubUsername}
            onChange={(event) => {
              setClubUsername(event.target.value);
            }}
            helperText="A short unique username for the club."
            required
          />
          <Select
            label="Sport"
            value={sportType}
            onChange={(event) => {
              setSportType(event.target.value);
            }}
            options={sports.map((s) => ({ value: s.name, label: s.name }))}
            required
          />
          <Input
            label="Info"
            value={info}
            onChange={(event) => {
              setInfo(event.target.value);
            }}
            multiline
            minRows={3}
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create club"}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
