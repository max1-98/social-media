import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountExport, UpdateProfilePayload } from "../api";
import { fireEvent, render, screen, waitFor } from "../test/renderWithTheme.tsx";
import type { User } from "../types";

import { ProfilePage } from "./ProfilePage.tsx";

const exportAccount = vi.fn<() => Promise<AccountExport>>();
const deleteAccount = vi.fn<(password: string) => Promise<{ detail: string }>>();
const updateProfile = vi.fn<(payload: UpdateProfilePayload) => Promise<User>>();
const logout = vi.fn<() => Promise<void>>();
const refresh = vi.fn<() => Promise<User | null>>();
const navigate = vi.fn();

const user: User = {
  id: 1,
  username: "alice",
  email: "alice@example.com",
  first_name: "Alice",
  surname: "Smith",
  date_of_birth: "1990-01-01",
  biological_gender: "female",
  email_verified: true,
  parental_consent_required: false,
};

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    accountApi: {
      exportAccount: () => exportAccount(),
      deleteAccount: (p: string) => deleteAccount(p),
    },
    authApi: {
      ...actual.authApi,
      updateProfile: (payload: UpdateProfilePayload) => updateProfile(payload),
    },
  };
});

vi.mock("../hooks", () => ({
  useAuth: () => ({ user, loading: false, logout, refresh }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

function renderPage(): void {
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
}

describe("ProfilePage", () => {
  const createObjectURL = vi.fn(() => "blob:mock");
  beforeEach(() => {
    Object.assign(URL, {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the signed-in user's details", () => {
    renderPage();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText(/alice@example.com/)).toBeInTheDocument();
  });

  it("exports the account data as a downloadable file", async () => {
    exportAccount.mockResolvedValue({
      user: { username: "alice" },
    } as unknown as AccountExport);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /export my data/i }));
    await waitFor(() => {
      expect(exportAccount).toHaveBeenCalledOnce();
    });
    expect(createObjectURL).toHaveBeenCalled();
  });

  it("edits the profile and refreshes auth state on save", async () => {
    updateProfile.mockResolvedValue(user);
    refresh.mockResolvedValue(user);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Alicia" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        first_name: "Alicia",
        surname: "Smith",
        biological_gender: "female",
      });
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("deletes the account after confirming the password", async () => {
    deleteAccount.mockResolvedValue({ detail: "Deleted." });
    logout.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /delete my account/i }));
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));
    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledWith("secret");
    });
    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/login");
  });
});
