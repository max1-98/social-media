import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ResetPasswordPayload } from "../api/auth";
import { fireEvent, render, screen, waitFor } from "../test/renderWithTheme.tsx";

import { ResetPasswordPage } from "./ResetPasswordPage.tsx";

const requestReset = vi.fn<(email: string) => Promise<{ detail: string }>>();
const resetPassword = vi.fn<(p: ResetPasswordPayload) => Promise<{ detail: string }>>();
const navigate = vi.fn();

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    authApi: {
      requestReset: (e: string) => requestReset(e),
      resetPassword: (p: ResetPasswordPayload) => resetPassword(p),
    },
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requests a reset link when no token is present", async () => {
    requestReset.mockResolvedValue({ detail: "Check your email." });
    renderAt("/reset-password");
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText("Check your email.")).toBeInTheDocument();
    expect(requestReset).toHaveBeenCalledWith("a@b.com");
  });

  it("sets a new password with the token and navigates to login", async () => {
    resetPassword.mockResolvedValue({ detail: "Password changed." });
    renderAt("/reset-password/tok99");
    const passwords = screen.getAllByLabelText(/password/i);
    fireEvent.change(passwords[0], { target: { value: "newpass1" } });
    fireEvent.change(passwords[1], { target: { value: "newpass1" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        password1: "newpass1",
        password2: "newpass1",
        password_token: "tok99",
      });
    });
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("rejects mismatched new passwords", () => {
    renderAt("/reset-password/tok99");
    const passwords = screen.getAllByLabelText(/password/i);
    fireEvent.change(passwords[0], { target: { value: "a" } });
    fireEvent.change(passwords[1], { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
