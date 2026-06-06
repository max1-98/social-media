import { describe, expect, it } from "vitest";

import { render, screen } from "../../test/renderWithTheme";
import type { ClubLadderEntry } from "../../types";

import { ClubLeaderboard } from "./ClubLeaderboard";

function entry(overrides: Partial<ClubLadderEntry> = {}): ClubLadderEntry {
  return {
    id: "c1",
    name: "Lions",
    club_username: "lions",
    elo: 1500,
    games_played: 4,
    member_strength: 1480,
    ...overrides,
  };
}

describe("ClubLeaderboard organism", () => {
  it("renders a grid row per club with rank, elo, games and strength", () => {
    render(
      <ClubLeaderboard
        entries={[
          entry({ id: "c1", name: "Lions", elo: 1500 }),
          entry({ id: "c2", name: "Tigers", elo: 1400, club_username: "tigers" }),
        ]}
      />,
    );
    expect(screen.getByRole("grid", { name: "Club ELO ladder" })).toBeInTheDocument();
    expect(screen.getByText("Lions")).toBeInTheDocument();
    expect(screen.getByText("@tigers")).toBeInTheDocument();
    expect(screen.getByText("1500")).toBeInTheDocument();
  });

  it("renders an em dash when member strength is null", () => {
    render(<ClubLeaderboard entries={[entry({ member_strength: null })]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the empty state when there are no clubs", () => {
    render(<ClubLeaderboard entries={[]} />);
    expect(screen.getByText("No clubs on the ladder yet.")).toBeInTheDocument();
  });

  it("shows a spinner while loading and an alert on error", () => {
    const { rerender } = render(<ClubLeaderboard entries={[]} loading />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    rerender(<ClubLeaderboard entries={[]} error="Boom" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
  });
});
