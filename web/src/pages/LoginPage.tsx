import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { ApiRequestError } from "../api";
import { Alert, Button, Text } from "../components/atoms";
import { FormField, PasswordField } from "../components/molecules";
import { PageLayout } from "../components/templates";
import { useAuth } from "../hooks";

/**
 * Login page. Authenticates via `useAuth().login` and surfaces the server error
 * envelope on failure — including the 403 returned when a minor whose parental
 * consent is still required tries to sign in.
 *
 * Intended route: `/login` (replaces the Stream 0 stub).
 */
export function LoginPage(): ReactElement {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ username, password });
      void navigate("/");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(
          err.status === 403
            ? `${err.message} If you are under 16, your account needs parental consent before you can sign in.`
            : err.message,
        );
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <Text variant="h1" gutterBottom>
        Log in
      </Text>
      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        aria-label="Log in"
      >
        <Stack spacing={1} sx={{ maxWidth: 360 }}>
          {error !== null && <Alert severity="error">{error}</Alert>}
          <FormField
            label="Username"
            name="username"
            value={username}
            onChange={setUsername}
            autoComplete="username"
            required
          />
          <PasswordField
            label="Password"
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Log in"}
          </Button>
          <Text variant="body2">
            Need an account? <RouterLink to="/register">Register</RouterLink>
          </Text>
          <Text variant="body2">
            Forgotten your password? <RouterLink to="/reset-password">Reset it</RouterLink>
          </Text>
        </Stack>
      </form>
    </PageLayout>
  );
}
