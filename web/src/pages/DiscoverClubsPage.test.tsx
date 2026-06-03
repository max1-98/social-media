import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../test/renderWithTheme.tsx";
import type { ManyClub } from "../types";

import { DiscoverClubsPage } from "./DiscoverClubsPage.tsx";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const allClubs = vi.fn<(bounds?: unknown) => Promise<ManyClub[]>>();
vi.mock("../api", () => ({
  ApiRequestError: class extends Error {},
  clubsApi: { allClubs: (bounds?: unknown) => allClubs(bounds) },
}));

vi.mock("../hooks", () => ({
  useUserLocation: () => ({ location: null, loading: false, error: null, locate: vi.fn() }),
}));

interface StubMapProps {
  onBoundsChange?: (b: unknown) => void;
  onClubSelect?: (id: number) => void;
}
vi.mock("../components/organisms", () => ({
  MapView: ({ onBoundsChange, onClubSelect }: StubMapProps) => (
    <div data-testid="map">
      <button
        type="button"
        onClick={() =>
          onBoundsChange?.({
            southWest: { lat: 1, lng: 2 },
            northEast: { lat: 3, lng: 4 },
          })
        }
      >
        move
      </button>
      <button type="button" onClick={() => onClubSelect?.(7)}>
        pick
      </button>
    </div>
  ),
}));

describe("DiscoverClubsPage", () => {
  it("loads clubs on mount and refetches with bounds on map move", async () => {
    allClubs.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <DiscoverClubsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(allClubs).toHaveBeenCalledWith(undefined);
    });
    fireEvent.click(screen.getByRole("button", { name: "move" }));
    await waitFor(() => {
      expect(allClubs).toHaveBeenCalledWith(
        expect.objectContaining({ southwest_lat: 1, northeast_lng: 4 }),
      );
    });
  });

  it("navigates to a club when a pin is selected", () => {
    allClubs.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <DiscoverClubsPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "pick" }));
    expect(navigate).toHaveBeenCalledWith("/club/7");
  });
});
