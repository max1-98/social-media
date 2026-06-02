import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CompleteGame } from "../types";

import { PastGamesPage } from "./PastGamesPage.tsx";

const userGames = vi.fn<() => Promise<CompleteGame[]>>();

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return { ...actual, gamesApi: { userGames: () => userGames() } };
});

const game: CompleteGame = {
  id: 7,
  team1: [{ id: 1, first_name: "A", surname: "B", username: "alice", elo: 1200 }],
  team2: [{ id: 2, first_name: "C", surname: "D", username: "bob", elo: 1100 }],
  game_type: 1,
  score: "6-4",
  start_time: "2024-05-01",
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <PastGamesPage />
    </MemoryRouter>,
  );
}

describe("PastGamesPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the user's completed games in a table", async () => {
    userGames.mockResolvedValue([game]);
    renderPage();
    expect(await screen.findByText("6-4")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /completed games/i })).toBeInTheDocument();
  });

  it("shows an empty state when there are no games", async () => {
    userGames.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/not completed any games/i)).toBeInTheDocument();
  });
});
