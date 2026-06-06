import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import type { SearchedUser } from "../../types";
import { Alert, Button, Modal, RadioGroup } from "../atoms";
import { DummyUserForm, MemberSearchForm } from "../molecules";
import type { DummyUserFormProps, MemberSearchFormProps } from "../molecules";

/** Which sub-form the modal is showing. */
type Mode = "dummy" | "search";

const DUMMY_FORM_ID = "add-user-dummy-form";

export interface AddUserModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Close the modal without acting. */
  onClose: () => void;
  /** Create a dummy member (the page also auto-activates them into the event). */
  onCreateDummyUser: DummyUserFormProps["onSubmit"];
  /** Invite the selected platform user to the club + event. */
  onInviteMember: (userId: string) => Promise<void>;
  /** Run a paginated username search. */
  onSearch: MemberSearchFormProps["onSearch"];
}

/**
 * Organism: the "Add user" modal launched from the matchmaking panel. A radio
 * group switches between creating a dummy member and searching for a platform
 * member to invite; the footer's primary action switches to match — "Create"
 * (dummy) or "Invite" (search). Both paths land the person in the event's active
 * set (the page wires the auto-activation / invite calls).
 */
export function AddUserModal({
  open,
  onClose,
  onCreateDummyUser,
  onInviteMember,
  onSearch,
}: AddUserModalProps): ReactElement {
  const [mode, setMode] = useState<Mode>("dummy");
  const [selected, setSelected] = useState<SearchedUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state each time the modal opens.
  useEffect(() => {
    if (open) {
      setMode("dummy");
      setSelected(null);
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  async function handleDummySubmit(draft: Parameters<typeof onCreateDummyUser>[0]): Promise<void> {
    await onCreateDummyUser(draft);
    onClose();
  }

  async function handleInvite(): Promise<void> {
    if (selected === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await onInviteMember(selected.id);
      onClose();
    } catch {
      setError("We could not invite that member. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const actions = (
    <>
      <Button variant="outlined" onClick={onClose}>
        Cancel
      </Button>
      {mode === "dummy" ? (
        <Button type="submit" form={DUMMY_FORM_ID}>
          Create
        </Button>
      ) : (
        <Button
          onClick={() => {
            void handleInvite();
          }}
          disabled={selected === null || submitting}
        >
          Invite
        </Button>
      )}
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Add user" actions={actions}>
      <Stack spacing={2}>
        <RadioGroup
          label="What would you like to add?"
          value={mode}
          onChange={(value) => {
            setMode(value as Mode);
            setError(null);
          }}
          options={[
            { value: "dummy", label: "Create dummy user" },
            { value: "search", label: "Search member" },
          ]}
        />

        {error !== null ? <Alert severity="error">{error}</Alert> : null}

        {mode === "dummy" ? (
          <DummyUserForm onSubmit={handleDummySubmit} formId={DUMMY_FORM_ID} />
        ) : (
          <MemberSearchForm onSearch={onSearch} onSelectionChange={setSelected} />
        )}
      </Stack>
    </Modal>
  );
}
