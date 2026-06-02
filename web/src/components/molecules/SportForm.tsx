import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import type { Sport } from "../../types";
import { Alert, Button, Select } from "../atoms";

export interface SportFormProps {
  /** The selectable sports (from `clubsApi.listSports`). */
  sports: Sport[];
  /** Optional pre-selected sport name. */
  initialSport?: string;
  /**
   * Persist the chosen sport. The page wires this to `clubsApi.addSport`; the
   * molecule stays free of the `api` layer per atomic-design boundaries.
   */
  onSubmit: (sportName: string) => Promise<void>;
}

/**
 * Molecule: pick a sport from the supported list and submit it for a club. Used
 * on create/edit flows to set a club's sport type. Surfaces a friendly error if
 * the submission fails.
 */
export function SportForm({ sports, initialSport = "", onSubmit }: SportFormProps): ReactElement {
  const [sport, setSport] = useState(initialSport);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (sport === "") {
      setError("Choose a sport first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(sport);
    } catch {
      setError("We could not save that sport. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} aria-label="Club sport">
      <Stack spacing={2} sx={{ maxWidth: 320 }}>
        {error !== null && <Alert severity="error">{error}</Alert>}
        <Select
          label="Sport"
          value={sport}
          onChange={(event) => {
            setSport(event.target.value);
          }}
          options={sports.map((s) => ({ value: s.name, label: s.name }))}
          fullWidth
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Add sport"}
        </Button>
      </Stack>
    </form>
  );
}
