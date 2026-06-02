import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import type { ManyClub } from "../types";

import { AllClubsPage } from "./AllClubsPage.tsx";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const allClubs = vi.fn<() => Promise<ManyClub[]>>();
vi.mock("../api", () => ({
  ApiRequestError: class extends Error {},
  clubsApi: { allClubs: () => allClubs() },
}));

const club: ManyClub = {
  id: 1,
  club_username: "smashers",
  name: "Smashers",
  sport_type: { name: "tennis" },
  info: "",
  logo: "",
  coordinates: null,
  is_active: true,
  is_event_upcoming: false,
  average_attendance: "New!",
};

describe("AllClubsPage", () => {
  it("renders a grid of clubs from the API", async () => {
    allClubs.mockResolvedValue([club]);
    render(
      <MemoryRouter>
        <AllClubsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Smashers")).toBeInTheDocument();
    await waitFor(() => {
      expect(allClubs).toHaveBeenCalled();
    });
  });
});
