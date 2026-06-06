import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { Alert, Button, Input, Select } from "../atoms";

/** The values collected by {@link DummyUserForm}. */
export interface DummyUserDraft {
  first_name: string;
  surname: string;
  biological_gender: "male" | "female";
}

export interface DummyUserFormProps {
  /**
   * Persist the dummy user. The page wires this to `clubsApi.createDummyUser`;
   * the molecule stays free of the `api` layer per atomic-design boundaries.
   */
  onSubmit: (draft: DummyUserDraft) => Promise<void>;
  /**
   * When set, the `<form>` adopts this id and the internal submit button is
   * hidden, letting an external footer button drive submission via
   * `<button type="submit" form={formId}>`. Used when embedded in a modal.
   */
  formId?: string;
}

/**
 * Molecule: create a dummy/placeholder member for a club. A club admin adds
 * people who don't have an account so they can be activated into the night.
 * Surfaces a friendly error if the submission fails and clears the fields on
 * success. Renders its own submit button standalone, or hides it when `formId`
 * is supplied so a modal footer can drive the submit.
 */
export function DummyUserForm({ onSubmit, formId }: DummyUserFormProps): ReactElement {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (firstName.trim() === "" || surname.trim() === "") {
      setError("Enter a first name and surname.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        first_name: firstName.trim(),
        surname: surname.trim(),
        biological_gender: gender,
      });
      setFirstName("");
      setSurname("");
      setGender("male");
    } catch {
      setError("We could not add that dummy user. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id={formId} onSubmit={(event) => void handleSubmit(event)} aria-label="Add a dummy user">
      <Stack spacing={2} sx={{ maxWidth: 320 }}>
        {error !== null && <Alert severity="error">{error}</Alert>}
        <Input
          label="First name"
          value={firstName}
          onChange={(event) => {
            setFirstName(event.target.value);
          }}
          fullWidth
        />
        <Input
          label="Surname"
          value={surname}
          onChange={(event) => {
            setSurname(event.target.value);
          }}
          fullWidth
        />
        <Select
          label="Biological gender"
          value={gender}
          onChange={(event) => {
            setGender(event.target.value as "male" | "female");
          }}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
          fullWidth
        />
        {formId === undefined ? (
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add dummy user"}
          </Button>
        ) : null}
      </Stack>
    </form>
  );
}
