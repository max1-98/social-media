import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ApiRequestError, authApi } from "../api";
import { Alert, Button, Text } from "../components/atoms";
import { FormField, PasswordField } from "../components/molecules";
import { AuthCard } from "../components/organisms";
import { PageLayout } from "../components/templates";

/**
 * Password-reset page covering both flows:
 *  - no token → request a reset link (`authApi.requestReset`).
 *  - token present (`:token` route param or `?token=`) → set a new password via
 *    `authApi.resetPassword` (password1/password2/password_token).
 *
 * Intended routes: `/reset-password` (request) and `/reset-password/:token` (set).
 */
export function ResetPasswordPage(): ReactElement {
  const { token: paramToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = paramToken ?? searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onRequest(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const res = await authApi.requestReset(email);
      setInfo(res.detail);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not send a reset link.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onReset(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (password1 !== password2) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword({ password1, password2, password_token: token });
      void navigate("/login");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not reset your password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (token !== "") {
    return (
      <PageLayout>
        <AuthCard title="Set a new password">
          <form
            onSubmit={(event) => {
              void onReset(event);
            }}
            aria-label="Set a new password"
          >
            <Stack spacing={2}>
              {error !== null && <Alert severity="error">{error}</Alert>}
              <PasswordField
                label="New password"
                name="password1"
                value={password1}
                onChange={setPassword1}
                autoComplete="new-password"
                required
              />
              <PasswordField
                label="Confirm new password"
                name="password2"
                value={password2}
                onChange={setPassword2}
                autoComplete="new-password"
                required
              />
              <Button type="submit" size="large" fullWidth disabled={submitting}>
                {submitting ? "Changing password…" : "Change password"}
              </Button>
            </Stack>
          </form>
        </AuthCard>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <AuthCard
        title="Reset password"
        subtitle="Enter your email and we will send you a link to reset your password."
      >
        <form
          onSubmit={(event) => {
            void onRequest(event);
          }}
          aria-label="Request a password reset"
        >
          <Stack spacing={2}>
            {error !== null && <Alert severity="error">{error}</Alert>}
            {info !== null && <Alert severity="success">{info}</Alert>}
            <FormField
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Button type="submit" size="large" fullWidth disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
            <Text variant="body2">
              Remembered it? <RouterLink to="/login">Log in</RouterLink>
            </Text>
          </Stack>
        </form>
      </AuthCard>
    </PageLayout>
  );
}
