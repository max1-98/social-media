import { vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";
import type { Game } from "../../types";

import { GameCard } from "./GameCard.tsx";

const game: Game = {
  id: "7",
  team1: [{ id: "1", first_name: "Ada", surname: "Lovelace", username: "ada", elo: 1200 }],
  team2: [{ id: "2", first_name: "Alan", surname: "Turing", username: "alan", elo: 1300 }],
};

describe("GameCard molecule", () => {
  it("shows both teams with player names and ELO", () => {
    render(<GameCard game={game} />);
    expect(screen.getByText("Ada Lovelace (1200)")).toBeInTheDocument();
    expect(screen.getByText("Alan Turing (1300)")).toBeInTheDocument();
  });

  it("hides admin controls for non-admins", () => {
    render(<GameCard game={game} onSubmitScore={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /submit score/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete game/i })).not.toBeInTheDocument();
  });

  it("submits a score and deletes via callbacks when admin", () => {
    const onSubmitScore = vi.fn<(gameId: string, score: string) => void>();
    const onDelete = vi.fn<(gameId: string) => void>();
    render(<GameCard game={game} isAdmin onSubmitScore={onSubmitScore} onDelete={onDelete} />);

    fireEvent.change(screen.getByLabelText("Team 1 score"), { target: { value: "21" } });
    fireEvent.click(screen.getByRole("button", { name: /submit score/i }));
    expect(onSubmitScore).toHaveBeenCalledWith("7", "21,0");

    fireEvent.click(screen.getByRole("button", { name: /delete game 7/i }));
    expect(onDelete).toHaveBeenCalledWith("7");
  });

  it("pauses a player via callback when admin", () => {
    const onPausePlayer = vi.fn<(gameId: string, memberId: string) => void>();
    render(<GameCard game={game} isAdmin onPausePlayer={onPausePlayer} />);
    fireEvent.click(screen.getByRole("button", { name: /pause ada lovelace/i }));
    expect(onPausePlayer).toHaveBeenCalledWith("7", "1");
  });
});
