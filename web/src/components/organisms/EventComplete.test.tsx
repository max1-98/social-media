import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { CompleteGame, EventStatsResult } from "../../types";

import { EventComplete } from "./EventComplete.tsx";

const stats: EventStatsResult = {
  best_winstreak_players: [{ name: "Ada Lovelace", best_winstreak: 3 }],
  highest_win_rate_players: [{ name: "Ada Lovelace", win_rate: 3 }],
  most_wins_players: [{ name: "Ada Lovelace", wins: 3 }],
  most_games_played_players: [{ name: "Alan Turing", games_played: 4 }],
  highest_elo_gain_players: [],
};

const completedGames: CompleteGame[] = [
  {
    id: 1,
    team1: [{ id: 1, first_name: "Ada", surname: "Lovelace", username: "ada", elo: 1200 }],
    team2: [{ id: 2, first_name: "Alan", surname: "Turing", username: "alan", elo: 1300 }],
    game_type: 1,
    score: "21,15",
    start_time: "18:30",
  },
];

describe("EventComplete organism", () => {
  it("renders the stat leaderboards and skips empty boards", () => {
    render(
      <EventComplete
        stats={stats}
        completedGames={completedGames}
        isAdmin={false}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByText(/best winstreak \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText(/most wins \(3\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/most elo gained/i)).not.toBeInTheDocument();
  });

  it("lists the completed games", () => {
    render(
      <EventComplete
        stats={stats}
        completedGames={completedGames}
        isAdmin={false}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ada Lovelace vs Alan Turing — 21,15/)).toBeInTheDocument();
  });

  it("lets an admin reactivate the event", () => {
    const onReactivate = vi.fn();
    render(<EventComplete stats={stats} completedGames={[]} isAdmin onReactivate={onReactivate} />);
    fireEvent.click(screen.getByRole("button", { name: /reactivate event/i }));
    expect(onReactivate).toHaveBeenCalledTimes(1);
  });
});
