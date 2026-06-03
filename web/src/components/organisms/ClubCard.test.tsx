import { vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";
import type { ManyClub } from "../../types";

import { ClubCard } from "./ClubCard.tsx";

const club: ManyClub = {
  id: "3",
  club_username: "smashers",
  name: "Smashers Tennis",
  sport_type: { name: "tennis" },
  info: "Friendly tennis club",
  logo: "",
  coordinates: { lat: 51, lng: 0 },
  is_active: true,
  is_event_upcoming: true,
  average_attendance: 12.4,
};

describe("ClubCard organism", () => {
  it("renders the club summary with status chips and a sport glyph", () => {
    render(<ClubCard club={club} />);
    expect(screen.getByText("Smashers Tennis")).toBeInTheDocument();
    expect(screen.getByText("@smashers")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Upcoming events")).toBeInTheDocument();
    expect(screen.getByText("Avg. attendance 13")).toBeInTheDocument();
    expect(screen.getByTitle("tennis club")).toBeInTheDocument();
  });

  it('shows the "New!" attendance label verbatim', () => {
    render(<ClubCard club={{ ...club, average_attendance: "New!" }} />);
    expect(screen.getByText("New!")).toBeInTheDocument();
  });

  it("fires onSelect when activated", () => {
    const onSelect = vi.fn();
    render(<ClubCard club={club} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /view smashers tennis/i }));
    expect(onSelect).toHaveBeenCalledWith("3");
  });
});
