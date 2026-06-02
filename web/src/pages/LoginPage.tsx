import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useNavigate } from "react-router-dom";

import { ApiRequestError } from "../api";
import { Alert, Button, Input, Text } from "../components/atoms";
import { PageLayout } from "../components/templates";
import { useAuth } from "../hooks";

/**
 * Minimal login page proving the auth flow end-to-end. The richer Account stream
 * adds register/verify/reset and form molecules; this is the Stream 0 stub.
 */
export function LoginPage(): ReactElement {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      await login({ username, password });
      void navigate("/");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Login failed.");
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
      >
        <Stack spacing={2} sx={{ maxWidth: 360 }}>
          {error !== null && <Alert severity="error">{error}</Alert>}
          <Input
            label="Username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
            }}
            autoComplete="username"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            autoComplete="current-password"
          />
          <Button type="submit">Log in</Button>
        </Stack>
      </form>
    </PageLayout>
  );
}
