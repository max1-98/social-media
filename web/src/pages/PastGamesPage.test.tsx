import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../test/renderWithTheme.tsx";
import type { CompleteGame, User } from "../types";

import { PastGamesPage } from "./PastGamesPage.tsx";

const userGames = vi.fn<() => Promise<CompleteGame[]>>();

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return { ...actual, gamesApi: { userGames: () => userGames() } };
});

const me: User = {
  id: "1",
  username: "alice",
  email: null,
  first_name: "A",
  surname: "B",
  date_of_birth: null,
  biological_gender: "unknown",
  email_verified: true,
  parental_consent_required: false,
};

vi.mock("../hooks", () => ({
  useAuth: () => ({ user: me, loading: false }),
}));

function makeGame(
  id: string,
  score: string,
  type: string,
  start: string,
  team1 = ["alice"],
  team2 = ["bob"],
): CompleteGame {
  const member = (u: string) => ({ id: u, first_name: u, surname: "X", username: u, elo: 1000 });
  return {
    id,
    team1: team1.map(member),
    team2: team2.map(member),
    game_type: 1,
    game_type_name: type,
    score,
    start_time: start,
  };
}

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

  it("renders the games grid with game type and a Won/Lost result", async () => {
    userGames.mockResolvedValue([
      makeGame("1", "21,15", "badminton singles", "2026-06-01T10:00:00Z"),
    ]);
    renderPage();
    expect(await screen.findByRole("grid", { name: /completed games/i })).toBeInTheDocument();
    expect(screen.getAllByText("badminton singles").length).toBeGreaterThan(0);
    // alice is on team1 which scored 21 > 15, so she won.
    expect(screen.getByText("Won")).toBeInTheDocument();
  });

  it("shows the win rate in the stats panel", async () => {
    userGames.mockResolvedValue([
      makeGame("1", "21,15", "badminton singles", "2026-06-01T10:00:00Z"), // win
      makeGame("2", "10,21", "badminton singles", "2026-06-02T10:00:00Z"), // loss
    ]);
    renderPage();
    expect(await screen.findByText("50%")).toBeInTheDocument();
  });

  it("filters the grid by game type", async () => {
    userGames.mockResolvedValue([
      makeGame("1", "21,15", "badminton singles", "2026-06-01T10:00:00Z"),
      makeGame("2", "21,9", "tennis singles", "2026-06-02T10:00:00Z", ["alice"], ["carol"]),
    ]);
    renderPage();
    await screen.findByRole("grid", { name: /completed games/i });
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("carol")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: /game type/i }));
    fireEvent.click(screen.getByRole("option", { name: "tennis singles" }));

    await waitFor(() => {
      expect(screen.queryByText("bob")).not.toBeInTheDocument();
    });
    expect(screen.getByText("carol")).toBeInTheDocument();
  });

  it("shows an empty state when there are no games", async () => {
    userGames.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/not completed any games/i)).toBeInTheDocument();
  });
});
