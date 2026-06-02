import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Link as RouterLink } from "react-router-dom";

import { ApiRequestError, authApi } from "../api";
import { Alert, Button, Select, Text } from "../components/atoms";
import { FormField, PasswordField } from "../components/molecules";
import { PageLayout } from "../components/templates";
import type { User } from "../types";

/** Digital-consent age (GDPR default; pending legal sign-off per rules/gdpr.md). */
const DIGITAL_CONSENT_AGE = 16;

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

/** Whole years between `dob` and today; `null` if `dob` is empty/invalid. */
function ageInYears(dob: string): number | null {
  if (dob === "") return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

/**
 * Registration page with an age gate. Collects username/email/name/date-of-birth/
 * gender/password, validates locally (passwords match, age present), then calls
 * `authApi.register`. On success it explains the email-verification step and, when
 * the new account is a minor (`parental_consent_required`), the parental-consent
 * path. Server-side is the source of truth for the age threshold.
 *
 * Intended route: `/register`.
 */
export function RegisterPage(): ReactElement {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [biologicalGender, setBiologicalGender] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<User | null>(null);

  const age = ageInYears(dateOfBirth);
  const isMinor = age !== null && age < DIGITAL_CONSENT_AGE;

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (age === null) {
      setError("Please enter a valid date of birth.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await authApi.register({
        username,
        email,
        password,
        first_name: firstName,
        surname,
        date_of_birth: dateOfBirth,
        biological_gender: biologicalGender,
      });
      setCreated(user);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created !== null) {
    return (
      <PageLayout>
        <Text variant="h1" gutterBottom>
          Account created
        </Text>
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <Alert severity="success">
            We have sent a verification link to your email. Open it to confirm your address before
            signing in.
          </Alert>
          {created.parental_consent_required ? (
            <Alert severity="warning">
              Because you are under {DIGITAL_CONSENT_AGE}, your account also needs parental consent.
              Sign-in stays blocked until a parent or guardian completes that step.
            </Alert>
          ) : null}
          <Text variant="body2">
            Already verified? <RouterLink to="/login">Log in</RouterLink>
          </Text>
        </Stack>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Text variant="h1" gutterBottom>
        Register
      </Text>
      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        aria-label="Register"
      >
        <Stack spacing={1} sx={{ maxWidth: 420 }}>
          {error !== null && <Alert severity="error">{error}</Alert>}
          <FormField
            label="Username"
            name="username"
            value={username}
            onChange={setUsername}
            autoComplete="username"
            required
          />
          <FormField
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
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
          <FormField
            label="Date of birth"
            name="date_of_birth"
            type="date"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            required
          />
          {isMinor ? (
            <Alert severity="info">
              You are under {DIGITAL_CONSENT_AGE}, so your account will require parental consent
              before you can sign in. You can still register now.
            </Alert>
          ) : null}
          <Select
            label="Biological gender"
            name="biological_gender"
            value={biologicalGender}
            onChange={(event) => {
              setBiologicalGender(event.target.value);
            }}
            options={GENDER_OPTIONS}
            helperText="Used only for mixed skill-based matchmaking."
            fullWidth
            margin="normal"
          />
          <PasswordField
            label="Password"
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
          />
          <PasswordField
            label="Confirm password"
            name="confirm_password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            required
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Register"}
          </Button>
          <Text variant="body2">
            Already have an account? <RouterLink to="/login">Log in</RouterLink>
          </Text>
        </Stack>
      </form>
    </PageLayout>
  );
}
