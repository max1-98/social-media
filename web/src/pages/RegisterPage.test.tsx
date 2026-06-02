import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RegisterPayload } from "../api";
import type { User } from "../types";

import { RegisterPage } from "./RegisterPage.tsx";

const register = vi.fn<(p: RegisterPayload) => Promise<User>>();

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return { ...actual, authApi: { register: (p: RegisterPayload) => register(p) } };
});

function baseUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: "kid",
    email: "k@example.com",
    first_name: null,
    surname: null,
    date_of_birth: "2015-01-01",
    biological_gender: "",
    email_verified: false,
    parental_consent_required: false,
    ...overrides,
  };
}

function fillRequired(dob: string): void {
  fireEvent.change(screen.getByLabelText(/Username/), { target: { value: "kid" } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "k@example.com" } });
  fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: dob } });
  const passwords = screen.getAllByLabelText(/password/i);
  fireEvent.change(passwords[0], { target: { value: "pw123456" } });
  fireEvent.change(passwords[1], { target: { value: "pw123456" } });
}

describe("RegisterPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the minor age-gate warning for an under-16 date of birth", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: "2015-01-01" } });
    expect(screen.getByText(/require parental consent/i)).toBeInTheDocument();
  });

  it("rejects mismatched passwords without calling the API", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: "kid" } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "k@example.com" } });
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: "1990-01-01" } });
    const passwords = screen.getAllByLabelText(/password/i);
    fireEvent.change(passwords[0], { target: { value: "aaaaaa" } });
    fireEvent.change(passwords[1], { target: { value: "bbbbbb" } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("registers an adult and explains email verification", async () => {
    register.mockResolvedValue(baseUser({ parental_consent_required: false }));
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    fillRequired("1990-01-01");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByText(/verification link/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(register).toHaveBeenCalledOnce();
    });
    expect(screen.queryByText(/parental consent/i)).not.toBeInTheDocument();
  });

  it("explains the parental-consent path when the new account is a minor", async () => {
    register.mockResolvedValue(baseUser({ parental_consent_required: true }));
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    fillRequired("2015-01-01");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByText(/needs parental consent/i)).toBeInTheDocument();
  });
});
