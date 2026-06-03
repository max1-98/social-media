import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../test/renderWithTheme.tsx";
import type { Club, Sport } from "../types";

import { CreateClubPage } from "./CreateClubPage.tsx";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const listSports = vi.fn<() => Promise<Sport[]>>();
const createClub = vi.fn<(p: unknown) => Promise<Club>>();
const addSport = vi.fn<(p: unknown) => Promise<{ message: string }>>();
vi.mock("../api", () => ({
  ApiRequestError: class extends Error {},
  clubsApi: {
    listSports: () => listSports(),
    createClub: (p: unknown) => createClub(p),
    addSport: (p: unknown) => addSport(p),
  },
}));

describe("CreateClubPage", () => {
  it("creates the club, sets the chosen sport, then navigates", async () => {
    listSports.mockResolvedValue([{ name: "tennis" }]);
    createClub.mockResolvedValue({ id: 9 } as Club);
    addSport.mockResolvedValue({ message: "ok" });
    render(
      <MemoryRouter>
        <CreateClubPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "New Club" } });
    fireEvent.change(screen.getByLabelText(/club handle/i), { target: { value: "newc" } });
    // Open the MUI select and choose the loaded sport.
    fireEvent.mouseDown(await screen.findByRole("combobox", { name: /sport/i }));
    fireEvent.click(await screen.findByRole("option", { name: "tennis" }));
    fireEvent.click(screen.getByRole("button", { name: /create club/i }));
    await waitFor(() => {
      expect(createClub).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Club", club_username: "newc" }),
      );
    });
    // The sport is persisted via a separate add-sport call (backend parity).
    expect(createClub).toHaveBeenCalledWith(expect.not.objectContaining({ sport_type: "tennis" }));
    expect(addSport).toHaveBeenCalledWith({ club_id: 9, sport_name: "tennis" });
    expect(navigate).toHaveBeenCalledWith("/club/9");
  });
});
