import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useNavigate } from "react-router-dom";

import { accountApi, ApiRequestError, authApi } from "../api";
import { Alert, Avatar, Button, Select, Spinner, Text } from "../components/atoms";
import { FormField, PasswordField } from "../components/molecules";
import { useAuth } from "../hooks";

/** Gender choices, matching the backend `male`/`female` CHECK (no empty value). */
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

/**
 * Profile page. Shows the signed-in user's details and a GDPR section:
 *  - "Export my data" downloads the account snapshot as JSON (Art. 20).
 *  - "Delete my account" runs erasure-by-anonymization after a password confirm.
 *
 * "Edit profile" toggles the details block into an inline edit form for GDPR
 * Art. 16 rectification (name + biological gender); saving PATCHes `/auth/me`
 * and refreshes the shared auth state.
 *
 * Intended route: `/profile` (auth-guarded).
 */
export function ProfilePage(): ReactElement {
  const { user, loading, logout, refresh } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState("male");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleExport(): Promise<void> {
    setExportError(null);
    setExporting(true);
    try {
      const data = await accountApi.exportAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `my-data-${data.user.username}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof ApiRequestError ? err.message : "Could not export your data.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setDeleteError(null);
    setDeleting(true);
    try {
      await accountApi.deleteAccount(deletePassword);
      await logout();
      void navigate("/login");
    } catch (err) {
      setDeleteError(
        err instanceof ApiRequestError ? err.message : "Could not delete your account.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function startEditing(): void {
    if (user === null) return;
    setFirstName(user.first_name ?? "");
    setSurname(user.surname ?? "");
    setGender(user.biological_gender);
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      await authApi.updateProfile({
        first_name: firstName,
        surname,
        biological_gender: gender,
      });
      await refresh();
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiRequestError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Spinner />;
  }

  if (user === null) {
    return <Alert severity="warning">You must be signed in to view your profile.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <Text variant="h1">My profile</Text>

      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Avatar>{user.username.charAt(0).toUpperCase()}</Avatar>
        <Box>
          <Text variant="h6">
            {user.first_name} {user.surname}
          </Text>
          <Text variant="body2" color="text.secondary">
            @{user.username}
          </Text>
        </Box>
      </Stack>

      {editing ? (
        <form
          onSubmit={(event) => {
            void handleSave(event);
          }}
        >
          <Stack spacing={1} sx={{ maxWidth: 480 }}>
            {saveError !== null && <Alert severity="error">{saveError}</Alert>}
            <FormField
              label="First name"
              name="first_name"
              value={firstName}
              onChange={setFirstName}
              autoComplete="given-name"
            />
            <FormField
              label="Surname"
              name="surname"
              value={surname}
              onChange={setSurname}
              autoComplete="family-name"
            />
            <Select
              label="Biological gender"
              name="biological_gender"
              value={gender}
              onChange={(event) => {
                setGender(event.target.value);
              }}
              options={GENDER_OPTIONS}
              helperText="Used only for mixed skill-based matchmaking."
              fullWidth
              margin="normal"
            />
            <Stack direction="row" spacing={1}>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                onClick={() => {
                  setEditing(false);
                }}
                disabled={saving}
                aria-label="Cancel editing"
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </form>
      ) : (
        <>
          <Stack spacing={0.5}>
            <Text>Email: {user.email ?? "—"}</Text>
            <Text>Date of birth: {user.date_of_birth ?? "—"}</Text>
            <Text>Email verified: {user.email_verified ? "Yes" : "No"}</Text>
            {user.parental_consent_required ? (
              <Alert severity="warning">Parental consent is still required for this account.</Alert>
            ) : null}
          </Stack>

          <Box>
            <Button onClick={startEditing}>Edit profile</Button>
          </Box>
        </>
      )}

      <Divider />

      <Text variant="h2">Your data &amp; privacy</Text>
      <Stack spacing={2} sx={{ maxWidth: 520 }}>
        <Box>
          <Text gutterBottom>Download a copy of your personal data (GDPR data portability).</Text>
          {exportError !== null && <Alert severity="error">{exportError}</Alert>}
          <Button
            onClick={() => {
              void handleExport();
            }}
            disabled={exporting}
          >
            {exporting ? "Preparing…" : "Export my data"}
          </Button>
        </Box>

        <Box>
          <Text gutterBottom>
            Delete your account. We anonymise your personal data so shared games, ELO and event
            history remain valid for other members; this cannot be undone.
          </Text>
          <Button
            onClick={() => {
              setConfirmOpen(true);
            }}
          >
            Delete my account
          </Button>
        </Box>
      </Stack>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!deleting) setConfirmOpen(false);
        }}
        aria-labelledby="delete-account-title"
      >
        <DialogTitle id="delete-account-title">Delete your account?</DialogTitle>
        <DialogContent>
          <Text gutterBottom>
            This anonymises your account permanently. Confirm your password to continue.
          </Text>
          {deleteError !== null && <Alert severity="error">{deleteError}</Alert>}
          <PasswordField
            label="Password"
            name="confirm_delete_password"
            value={deletePassword}
            onChange={setDeletePassword}
            autoComplete="current-password"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmOpen(false);
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handleDelete();
            }}
            disabled={deleting || deletePassword === ""}
          >
            {deleting ? "Deleting…" : "Delete account"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
