import { describe, expect, it } from "vitest";

import { render, screen } from "../../test/renderWithTheme";
import type { PastGamesStats } from "../../types";

import { GameStatsSummary } from "./GameStatsSummary";

const stats: PastGamesStats = {
  record: { total: 10, wins: 7, losses: 3, winRate: 0.7 },
  byType: [{ name: "badminton singles", total: 6, wins: 4, losses: 2, winRate: 0.6667 }],
  form: { currentWinStreak: 2, bestWinStreak: 4, lastN: ["W", "W", "L"] },
  partners: [{ username: "ally", games: 5 }],
  opponents: [{ username: "foe", games: 8 }],
};

describe("GameStatsSummary organism", () => {
  it("renders the headline win rate and record", () => {
    render(<GameStatsSummary stats={stats} />);
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText(/7W – 3L/)).toBeInTheDocument();
  });

  it("renders streaks and recent-form chips", () => {
    render(<GameStatsSummary stats={stats} />);
    expect(screen.getByText(/Streak 2 · Best 4/)).toBeInTheDocument();
    const form = screen.getByLabelText("Recent form");
    expect(form).toHaveTextContent("WWL");
  });

  it("lists the per-type breakdown and top partners/opponents", () => {
    render(<GameStatsSummary stats={stats} />);
    expect(screen.getByText("badminton singles")).toBeInTheDocument();
    expect(screen.getByText("@ally")).toBeInTheDocument();
    expect(screen.getByText("@foe")).toBeInTheDocument();
  });
});
