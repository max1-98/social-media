import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "../api";

import { VerifyEmailPage } from "./VerifyEmailPage.tsx";

const verifyEmail = vi.fn<(token: string) => Promise<{ detail: string }>>();

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return { ...actual, authApi: { verifyEmail: (t: string) => verifyEmail(t) } };
});

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("VerifyEmailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("verifies the token from the route param on mount", async () => {
    verifyEmail.mockResolvedValue({ detail: "Email verified." });
    renderAt("/verify-email/tok123");
    expect(await screen.findByText("Email verified.")).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledWith("tok123");
  });

  it("reads the token from the query string", async () => {
    verifyEmail.mockResolvedValue({ detail: "Email verified." });
    renderAt("/verify-email?token=qtok");
    await screen.findByText("Email verified.");
    expect(verifyEmail).toHaveBeenCalledWith("qtok");
  });

  it("shows an error when verification fails", async () => {
    verifyEmail.mockRejectedValue(new ApiRequestError(400, "bad_token", "Invalid token."));
    renderAt("/verify-email/bad");
    expect(await screen.findByText("Invalid token.")).toBeInTheDocument();
  });

  it("warns when no token is present", () => {
    renderAt("/verify-email");
    expect(screen.getByText(/missing its verification token/i)).toBeInTheDocument();
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});
