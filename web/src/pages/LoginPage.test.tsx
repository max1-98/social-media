import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "../api";

import { LoginPage } from "./LoginPage.tsx";

const login = vi.fn<(p: { username: string; password: string }) => Promise<void>>();
const navigate = vi.fn();

vi.mock("../hooks", () => ({
  useAuth: () => ({ login }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

function renderPage(): void {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs in and navigates home on success", async () => {
    login.mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "pw" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ username: "alice", password: "pw" });
    });
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("surfaces the parental-consent hint on a 403", async () => {
    login.mockRejectedValue(new ApiRequestError(403, "forbidden", "Account blocked."));
    renderPage();

    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: "kid" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "pw" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText(/parental consent/i)).toBeInTheDocument();
  });

  it("links to register and reset", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /reset it/i })).toBeInTheDocument();
  });
});
