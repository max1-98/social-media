import { vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";
import type { Fixture } from "../../types";

import { FixtureCard } from "./FixtureCard.tsx";

const baseFixture: Fixture = {
  id: "fx1",
  home_club: "home1",
  away_club: "away1",
  home_club_name: "Lions",
  away_club_name: "Tigers",
  game_type: 3,
  game_type_name: "Singles",
  date: "2026-07-01",
  status: "proposed",
  created_at: "2026-06-01T00:00:00Z",
};

describe("FixtureCard molecule", () => {
  it("shows the matchup, meta and status chip", () => {
    render(<FixtureCard fixture={baseFixture} />);
    expect(screen.getByText("Lions vs Tigers")).toBeInTheDocument();
    expect(screen.getByText(/Singles · 2026-07-01/)).toBeInTheDocument();
    expect(screen.getByText("Proposed")).toBeInTheDocument();
  });

  it("falls back to placeholders when game type and date are missing", () => {
    render(<FixtureCard fixture={{ ...baseFixture, game_type_name: null, date: null }} />);
    expect(screen.getByText(/Any game type · Date TBC/)).toBeInTheDocument();
  });

  it("accepts or declines a proposal when the viewer may respond", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(
      <FixtureCard fixture={baseFixture} canRespond onAccept={onAccept} onDecline={onDecline} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /accept fixture/i }));
    fireEvent.click(screen.getByRole("button", { name: /decline fixture/i }));
    expect(onAccept).toHaveBeenCalledWith(baseFixture);
    expect(onDecline).toHaveBeenCalledWith(baseFixture);
  });

  it("records a result for an accepted fixture a manager owns", () => {
    const onRecordResult = vi.fn();
    const accepted: Fixture = { ...baseFixture, status: "accepted" };
    render(<FixtureCard fixture={accepted} canManage onRecordResult={onRecordResult} />);
    fireEvent.click(screen.getByRole("button", { name: /record result/i }));
    expect(onRecordResult).toHaveBeenCalledWith(accepted);
  });

  it("confirms a played fixture's result", () => {
    const onConfirm = vi.fn();
    const played: Fixture = { ...baseFixture, status: "played" };
    render(<FixtureCard fixture={played} canManage onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: /confirm result/i }));
    expect(onConfirm).toHaveBeenCalledWith(played);
  });

  it("hides actions for unprivileged viewers", () => {
    render(<FixtureCard fixture={baseFixture} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
