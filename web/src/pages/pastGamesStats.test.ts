import { describe, expect, it } from "vitest";

import type { CompleteGame, MemberEvent } from "../types";

import { pastGamesStats } from "./pastGamesStats";

function member(username: string): MemberEvent {
  return { id: username, first_name: username, surname: "X", username, elo: 1000 };
}

function game(
  id: string,
  team1: string[],
  team2: string[],
  score: string,
  start_time: string,
  game_type_name: string | null = "badminton singles",
): CompleteGame {
  return {
    id,
    team1: team1.map(member),
    team2: team2.map(member),
    game_type: 1,
    game_type_name,
    score,
    start_time,
  };
}

const ME = "me";

describe("pastGamesStats", () => {
  it("derives wins/losses from team membership and comma scores", () => {
    const games: CompleteGame[] = [
      game("1", [ME, "ally"], ["foe1", "foe2"], "21,15", "2026-06-01T10:00:00Z"), // team1 win
      game("2", ["foe1", "foe2"], [ME, "ally"], "21,10", "2026-06-02T10:00:00Z"), // team2 loss for me
      game("3", [ME], ["foe1"], "18,21", "2026-06-03T10:00:00Z"), // team2 win -> loss for me
    ];
    const { record } = pastGamesStats(games, ME);
    expect(record.total).toBe(3);
    expect(record.wins).toBe(1);
    expect(record.losses).toBe(2);
    expect(record.winRate).toBeCloseTo(1 / 3);
  });

  it("ignores games the user is not in and unparseable scores", () => {
    const games: CompleteGame[] = [
      game("1", ["a"], ["b"], "21,5", "2026-06-01T10:00:00Z"), // not me
      game("2", [ME], ["b"], "not-a-score", "2026-06-02T10:00:00Z"), // bad score
      game("3", [ME], ["b"], "21,9", "2026-06-03T10:00:00Z"), // valid win
    ];
    const { record } = pastGamesStats(games, ME);
    expect(record.total).toBe(1);
    expect(record.wins).toBe(1);
  });

  it("returns a zero win rate with no games", () => {
    expect(pastGamesStats([], ME).record).toEqual({ total: 0, wins: 0, losses: 0, winRate: 0 });
  });

  it("breaks records down per game type with an Unknown fallback", () => {
    const games: CompleteGame[] = [
      game("1", [ME], ["b"], "21,5", "2026-06-01T10:00:00Z", "tennis singles"),
      game("2", [ME], ["b"], "10,21", "2026-06-02T10:00:00Z", "tennis singles"),
      game("3", [ME], ["b"], "21,3", "2026-06-03T10:00:00Z", null),
    ];
    const { byType } = pastGamesStats(games, ME);
    const tennis = byType.find((t) => t.name === "tennis singles");
    const unknown = byType.find((t) => t.name === "Unknown");
    expect(tennis).toMatchObject({ total: 2, wins: 1, losses: 1 });
    expect(unknown).toMatchObject({ total: 1, wins: 1 });
  });

  it("computes current and best win streaks plus recent form", () => {
    // Chronological: win, win, loss, win (most recent). Current streak = 1.
    const games: CompleteGame[] = [
      game("1", [ME], ["b"], "21,1", "2026-06-01T10:00:00Z"),
      game("2", [ME], ["b"], "21,1", "2026-06-02T10:00:00Z"),
      game("3", [ME], ["b"], "1,21", "2026-06-03T10:00:00Z"),
      game("4", [ME], ["b"], "21,1", "2026-06-04T10:00:00Z"),
    ];
    const { form } = pastGamesStats(games, ME);
    expect(form.currentWinStreak).toBe(1);
    expect(form.bestWinStreak).toBe(2);
    expect(form.lastN).toEqual(["W", "L", "W", "W"]);
  });

  it("ranks partners and opponents by shared games", () => {
    const games: CompleteGame[] = [
      game("1", [ME, "ally"], ["foe", "foe2"], "21,5", "2026-06-01T10:00:00Z"),
      game("2", [ME, "ally"], ["foe", "foe3"], "21,5", "2026-06-02T10:00:00Z"),
      game("3", ["foe", ME], ["ally"], "21,5", "2026-06-03T10:00:00Z"),
    ];
    const { partners, opponents } = pastGamesStats(games, ME);
    expect(partners[0]).toEqual({ username: "ally", games: 2 });
    expect(opponents[0]).toEqual({ username: "foe", games: 2 });
  });
});
