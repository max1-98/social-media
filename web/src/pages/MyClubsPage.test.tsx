import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { render, screen } from "../test/renderWithTheme.tsx";
import type { MyClub } from "../types";

import { MyClubsPage } from "./MyClubsPage.tsx";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

const myClubs = vi.fn<() => Promise<MyClub[]>>();
vi.mock("../api", () => ({
  ApiRequestError: class extends Error {},
  clubsApi: { myClubs: () => myClubs() },
}));

describe("MyClubsPage", () => {
  it("lists the user's clubs", async () => {
    myClubs.mockResolvedValue([
      { id: 2, name: "Padel Pals", logo: "", sport_type: { name: "padel" } },
    ]);
    render(
      <MemoryRouter>
        <MyClubsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Padel Pals")).toBeInTheDocument();
  });

  it("shows an empty state when there are no memberships", async () => {
    myClubs.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <MyClubsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/not a member of any clubs/i)).toBeInTheDocument();
  });
});
