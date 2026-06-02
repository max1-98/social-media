import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import type { Club, Social, Sport } from "../types";

import { EditClubPage } from "./EditClubPage.tsx";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

const clubDetail = vi.fn<() => Promise<Club>>();
const listSports = vi.fn<() => Promise<Sport[]>>();
const clubSocials = vi.fn<() => Promise<Social[]>>();
const editClub = vi.fn<(pk: unknown, p: unknown) => Promise<Club>>();
const updateSocials = vi.fn<(pk: unknown, p: unknown) => Promise<unknown>>();
vi.mock("../api", () => ({
  ApiRequestError: class extends Error {},
  clubsApi: {
    clubDetail: () => clubDetail(),
    listSports: () => listSports(),
    clubSocials: () => clubSocials(),
    editClub: (pk: unknown, p: unknown) => editClub(pk, p),
    updateSocials: (pk: unknown, p: unknown) => updateSocials(pk, p),
    addSport: vi.fn(),
  },
}));

const club: Club = {
  id: 5,
  club_username: "smashers",
  name: "Smashers",
  sport_type: { name: "tennis" },
  president: "ada",
  info: "Best club",
  date_created: "2026-01-01",
  logo: "",
  address: "",
  coordinates: null,
  is_club_admin: true,
  is_club_president: true,
  membership_status: 2,
  is_active: true,
  is_event_upcoming: false,
  average_attendance: "New!",
  member_requests: 0,
};

describe("EditClubPage", () => {
  it("prefills and saves name/info plus socials", async () => {
    clubDetail.mockResolvedValue(club);
    listSports.mockResolvedValue([{ name: "tennis" }]);
    clubSocials.mockResolvedValue([]);
    editClub.mockResolvedValue(club);
    updateSocials.mockResolvedValue({ detail: "ok" });

    render(
      <MemoryRouter initialEntries={["/club/edit/5"]}>
        <Routes>
          <Route path="/club/edit/:clubId" element={<EditClubPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const nameField = await screen.findByDisplayValue("Smashers");
    fireEvent.change(nameField, { target: { value: "Smashers FC" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(editClub).toHaveBeenCalledWith("5", { name: "Smashers FC", info: "Best club" });
    });
    expect(updateSocials).toHaveBeenCalled();
    expect(await screen.findByText(/club updated/i)).toBeInTheDocument();
  });
});
