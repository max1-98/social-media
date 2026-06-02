import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { EventDetail, Game, Member } from "../../types";

import { MatchmakingPanel } from "./MatchmakingPanel.tsx";

const member = (id: number, first: string): Member => ({
  id,
  first_name: first,
  surname: "X",
  username: first.toLowerCase(),
  is_club_admin: false,
});

const event: EventDetail = {
  id: 1,
  game_type: { name: "badminton doubles" },
  date: "2026-07-01",
  start_time: "18:00",
  finish_time: "20:00",
  number_of_courts: 4,
  sbmm: true,
  guests_allowed: false,
  over_18_under_18_mixed: "all ages",
  active_members: [member(1, "Ada")],
  in_game_members: [],
  event_active: true,
  event_complete: false,
  mode: "sbmm",
  even_teams: true,
  team_size: 2,
};

const games: Game[] = [
  {
    id: 3,
    team1: [{ id: 1, first_name: "Ada", surname: "L", username: "ada", elo: 1200 }],
    team2: [{ id: 2, first_name: "Al", surname: "T", username: "al", elo: 1250 }],
  },
];

function renderPanel(isAdmin: boolean): {
  onCreateGame: ReturnType<typeof vi.fn>;
  onDeactivateMember: ReturnType<typeof vi.fn>;
} {
  const onCreateGame = vi.fn();
  const onDeactivateMember = vi.fn();
  render(
    <MatchmakingPanel
      event={event}
      games={games}
      isAdmin={isAdmin}
      members={[member(1, "Ada"), member(2, "Al")]}
      onCreateGame={onCreateGame}
      onCompleteEvent={vi.fn()}
      onSubmitScore={vi.fn()}
      onDeleteGame={vi.fn()}
      onPausePlayer={vi.fn()}
      onActivateMember={vi.fn()}
      onDeactivateMember={onDeactivateMember}
    />,
  );
  return { onCreateGame, onDeactivateMember };
}

describe("MatchmakingPanel organism", () => {
  it("renders in-progress games", () => {
    renderPanel(true);
    expect(screen.getByLabelText("Game 3")).toBeInTheDocument();
  });

  it("shows admin controls and fires create/deactivate callbacks", () => {
    const { onCreateGame, onDeactivateMember } = renderPanel(true);
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    expect(onCreateGame).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /deactivate ada/i }));
    expect(onDeactivateMember).toHaveBeenCalledWith(1);
  });

  it("warns when there are too few active players", () => {
    renderPanel(true);
    expect(screen.getByText(/few available players/i)).toBeInTheDocument();
  });

  it("hides admin controls for non-admins", () => {
    renderPanel(false);
    expect(screen.queryByRole("button", { name: "Create game" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Active members" })).not.toBeInTheDocument();
  });
});
