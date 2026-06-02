import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Elo } from "../types";

import { GameTypeElosPage } from "./GameTypeElosPage.tsx";

const elosForUser = vi.fn<(username: string) => Promise<Elo[]>>();

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return { ...actual, eloApi: { elosForUser: (u: string) => elosForUser(u) } };
});

vi.mock("../hooks", () => ({
  useAuth: () => ({ user: { username: "alice" } }),
}));

const elo: Elo = {
  game_type: "Singles",
  elo: 1234,
  winstreak: 3,
  last_game: "2024-01-01",
  best_winstreak: 5,
  winrate: 1.5,
  total_games: 10,
  sport: "Tennis",
  style: "Competitive",
  wins: 6,
};

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/elos/:username" element={<GameTypeElosPage />} />
        <Route path="/elos" element={<GameTypeElosPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("GameTypeElosPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads ELOs for the username route param", async () => {
    elosForUser.mockResolvedValue([elo]);
    renderAt("/elos/bob");
    expect(await screen.findByText("1234")).toBeInTheDocument();
    expect(elosForUser).toHaveBeenCalledWith("bob");
    expect(screen.getByText(/Tennis · Competitive/)).toBeInTheDocument();
  });

  it("falls back to the current user when no param is given", async () => {
    elosForUser.mockResolvedValue([]);
    renderAt("/elos");
    await screen.findByText(/No sports stats yet/i);
    expect(elosForUser).toHaveBeenCalledWith("alice");
  });

  it("shows an empty state when there are no ratings", async () => {
    elosForUser.mockResolvedValue([]);
    renderAt("/elos/bob");
    expect(await screen.findByText(/No sports stats yet/i)).toBeInTheDocument();
  });
});
