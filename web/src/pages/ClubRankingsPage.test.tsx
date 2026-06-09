import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "../test/renderWithTheme.tsx";
import type { ClubLadderEntry, GameTypeSummary } from "../types";

import { ClubRankingsPage } from "./ClubRankingsPage.tsx";

const gameTypes = vi.fn<() => Promise<GameTypeSummary[]>>();
const clubLeaderboard = vi.fn<(gameType?: string) => Promise<ClubLadderEntry[]>>();

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    gamesApi: { gameTypes: () => gameTypes() },
    fixturesApi: { clubLeaderboard: (g?: string) => clubLeaderboard(g) },
  };
});

const entry: ClubLadderEntry = {
  id: "club_1",
  name: "Smashers",
  club_username: "smashers",
  elo: 1320,
  games_played: 8,
  member_strength: 1290,
};

describe("ClubRankingsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads the ladder for the first game type", async () => {
    gameTypes.mockResolvedValue([{ name: "badminton singles" }, { name: "tennis singles" }]);
    clubLeaderboard.mockResolvedValue([entry]);

    render(<ClubRankingsPage />);

    expect(await screen.findByText("Smashers")).toBeInTheDocument();
    expect(clubLeaderboard).toHaveBeenCalledWith("badminton singles");
  });

  it("shows an empty state when there are no game types", async () => {
    gameTypes.mockResolvedValue([]);

    render(<ClubRankingsPage />);

    expect(await screen.findByText(/No game types are available/i)).toBeInTheDocument();
    expect(clubLeaderboard).not.toHaveBeenCalled();
  });
});
