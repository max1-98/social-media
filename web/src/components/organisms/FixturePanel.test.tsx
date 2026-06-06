import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../test/renderWithTheme";
import type { Fixture } from "../../types";

import { FixturePanel } from "./FixturePanel";

const CLUB_ID = "homeClub";

function fixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: "fx1",
    home_club: CLUB_ID,
    away_club: "awayClub",
    home_club_name: "Lions",
    away_club_name: "Tigers",
    game_type: 3,
    game_type_name: "Singles",
    date: "2026-07-01",
    status: "proposed",
    created_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("FixturePanel organism", () => {
  it("shows the empty state when there are no fixtures", () => {
    render(<FixturePanel fixtures={[]} clubId={CLUB_ID} />);
    expect(screen.getByText("No fixtures scheduled yet.")).toBeInTheDocument();
  });

  it("renders a card per fixture", () => {
    render(<FixturePanel fixtures={[fixture(), fixture({ id: "fx2" })]} clubId={CLUB_ID} />);
    expect(screen.getAllByText("Lions vs Tigers")).toHaveLength(2);
  });

  it("hides the propose form from non-admins", () => {
    render(<FixturePanel fixtures={[]} clubId={CLUB_ID} onPropose={vi.fn()} />);
    expect(screen.queryByRole("form", { name: "Propose fixture" })).not.toBeInTheDocument();
  });

  it("proposes a fixture with the trimmed draft", async () => {
    const onPropose = vi.fn().mockResolvedValue(undefined);
    render(<FixturePanel fixtures={[]} clubId={CLUB_ID} isAdmin onPropose={onPropose} />);

    fireEvent.change(screen.getByLabelText("Away club id"), { target: { value: " away2 " } });
    fireEvent.change(screen.getByLabelText("Game type"), { target: { value: "Singles" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Propose fixture" }));

    await waitFor(() => {
      expect(onPropose).toHaveBeenCalledWith({
        awayClub: "away2",
        gameType: "Singles",
        date: "2026-08-01",
      });
    });
  });

  it("validates that an away club id is given", () => {
    const onPropose = vi.fn();
    render(<FixturePanel fixtures={[]} clubId={CLUB_ID} isAdmin onPropose={onPropose} />);
    fireEvent.click(screen.getByRole("button", { name: "Propose fixture" }));
    expect(onPropose).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/away club/i);
  });

  it("lets the away club admin respond to a proposal", () => {
    const onAccept = vi.fn();
    render(<FixturePanel fixtures={[fixture()]} clubId="awayClub" isAdmin onAccept={onAccept} />);
    fireEvent.click(screen.getByRole("button", { name: /accept fixture/i }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
