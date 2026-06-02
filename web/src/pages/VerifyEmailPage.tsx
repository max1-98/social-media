import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";

import { ApiRequestError, authApi } from "../api";
import { Alert, Spinner, Text } from "../components/atoms";
import { PageLayout } from "../components/templates";

type Status = "verifying" | "success" | "error" | "missing";

/**
 * Email-verification page. Reads the token from the `:token` route param or a
 * `?token=` query string and confirms the address via `authApi.verifyEmail` on
 * mount.
 *
 * Intended route: `/verify-email/:token` (also accepts `/verify-email?token=…`).
 */
export function VerifyEmailPage(): ReactElement {
  const { token: paramToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = paramToken ?? searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token === "" ? "missing" : "verifying");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (token === "") return;
    let cancelled = false;
    void authApi
      .verifyEmail(token)
      .then((res) => {
        if (cancelled) return;
        setStatus("success");
        setMessage(res.detail);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          err instanceof ApiRequestError ? err.message : "We could not verify this email link.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <PageLayout>
      <Text variant="h1" gutterBottom>
        Verify email
      </Text>
      <Stack spacing={2} sx={{ maxWidth: 420 }}>
        {status === "verifying" && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Spinner size={20} />
            <Text>Verifying your email…</Text>
          </Stack>
        )}
        {status === "missing" && (
          <Alert severity="warning">This link is missing its verification token.</Alert>
        )}
        {status === "success" && <Alert severity="success">{message}</Alert>}
        {status === "error" && <Alert severity="error">{message}</Alert>}
        {(status === "success" || status === "error") && (
          <Text variant="body2">
            <RouterLink to="/login">Continue to log in</RouterLink>
          </Text>
        )}
      </Stack>
    </PageLayout>
  );
}
