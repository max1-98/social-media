import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import type { Club, Sport } from "../types";

import { CreateClubPage } from "./CreateClubPage.tsx";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const listSports = vi.fn<() => Promise<Sport[]>>();
const createClub = vi.fn<(p: unknown) => Promise<Club>>();
vi.mock("../api", () => ({
  ApiRequestError: class extends Error {},
  clubsApi: {
    listSports: () => listSports(),
    createClub: (p: unknown) => createClub(p),
  },
}));

describe("CreateClubPage", () => {
  it("submits the form and navigates to the new club", async () => {
    listSports.mockResolvedValue([{ name: "tennis" }]);
    createClub.mockResolvedValue({ id: 9 } as Club);
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
    expect(navigate).toHaveBeenCalledWith("/club/9");
  });
});
