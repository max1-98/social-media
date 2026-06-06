import type {
  CompleteGame,
  FormStats,
  MemberEvent,
  PastGamesStats,
  PlayerTally,
  RecordStats,
  TypeStats,
} from "../types";

/** Fallback label for games whose game type name is missing. */
export const UNKNOWN_TYPE = "Unknown";
/** How many recent results `form.lastN` keeps. */
export const RECENT_FORM_LIMIT = 5;
/** How many partners/opponents the top lists keep. */
export const TOP_PLAYER_LIMIT = 5;

/** A game reduced to "did I win", with its members, for the signed-in user. */
interface ResolvedGame {
  iWon: boolean;
  game: CompleteGame;
  onTeam1: boolean;
}

function winRate(wins: number, total: number): number {
  return total === 0 ? 0 : wins / total;
}

/** Resolve a game to the user's perspective, or `null` if it can't be scored. */
function resolveGame(game: CompleteGame, username: string): ResolvedGame | null {
  const onTeam1 = game.team1.some((m) => m.username === username);
  const onTeam2 = game.team2.some((m) => m.username === username);
  if (!onTeam1 && !onTeam2) return null;

  const parts = game.score.split(",");
  if (parts.length !== 2) return null;
  const s1 = Number(parts[0]);
  const s2 = Number(parts[1]);
  if (!Number.isFinite(s1) || !Number.isFinite(s2)) return null;

  const team1Won = s1 > s2;
  const iWon = onTeam1 ? team1Won : !team1Won;
  return { iWon, game, onTeam1 };
}

/** The signed-in user's outcome for a single game, for display in the grid. */
export function userResult(game: CompleteGame, username: string): "Won" | "Lost" | "—" {
  const r = resolveGame(game, username);
  if (r === null) return "—";
  return r.iWon ? "Won" : "Lost";
}

function emptyRecord(): { total: number; wins: number; losses: number } {
  return { total: 0, wins: 0, losses: 0 };
}

function tallyTop(counts: Map<string, number>): PlayerTally[] {
  return [...counts.entries()]
    .map(([uname, games]) => ({ username: uname, games }))
    .sort((a, b) =>
      b.games - a.games !== 0 ? b.games - a.games : a.username.localeCompare(b.username),
    )
    .slice(0, TOP_PLAYER_LIMIT);
}

/**
 * Derive the Past games statistics for a single user from their completed
 * games. Pure and deterministic so it can be unit-tested in isolation. Games
 * the user isn't in, or with an unparseable score, are ignored.
 */
export function pastGamesStats(games: CompleteGame[], username: string): PastGamesStats {
  const resolved = games
    .map((g) => resolveGame(g, username))
    .filter((r): r is ResolvedGame => r !== null);

  // Overall record.
  const wins = resolved.filter((r) => r.iWon).length;
  const total = resolved.length;
  const record: RecordStats = { total, wins, losses: total - wins, winRate: winRate(wins, total) };

  // Per-game-type breakdown.
  const byTypeMap = new Map<string, { total: number; wins: number; losses: number }>();
  for (const r of resolved) {
    const name = r.game.game_type_name ?? UNKNOWN_TYPE;
    const bucket = byTypeMap.get(name) ?? emptyRecord();
    bucket.total += 1;
    if (r.iWon) bucket.wins += 1;
    else bucket.losses += 1;
    byTypeMap.set(name, bucket);
  }
  const byType: TypeStats[] = [...byTypeMap.entries()]
    .map(([name, b]) => ({ name, ...b, winRate: winRate(b.wins, b.total) }))
    .sort((a, b) => (b.total - a.total !== 0 ? b.total - a.total : a.name.localeCompare(b.name)));

  // Streaks & recent form — most recent first (the API already orders DESC, but
  // re-sort defensively by start_time then id).
  const chronoDesc = [...resolved].sort((a, b) => {
    const byTime = b.game.start_time.localeCompare(a.game.start_time);
    return byTime !== 0 ? byTime : b.game.id.localeCompare(a.game.id);
  });
  let currentWinStreak = 0;
  for (const r of chronoDesc) {
    if (!r.iWon) break;
    currentWinStreak += 1;
  }
  let bestWinStreak = 0;
  let run = 0;
  for (const r of chronoDesc) {
    if (r.iWon) {
      run += 1;
      bestWinStreak = Math.max(bestWinStreak, run);
    } else {
      run = 0;
    }
  }
  const lastN: ("W" | "L")[] = chronoDesc
    .slice(0, RECENT_FORM_LIMIT)
    .map((r) => (r.iWon ? "W" : "L"));
  const form: FormStats = { currentWinStreak, bestWinStreak, lastN };

  // Partners (my team) and opponents (the other team).
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const bump = (counts: Map<string, number>, members: MemberEvent[]): void => {
    for (const m of members) {
      if (m.username === username) continue;
      counts.set(m.username, (counts.get(m.username) ?? 0) + 1);
    }
  };
  for (const r of resolved) {
    const myTeam = r.onTeam1 ? r.game.team1 : r.game.team2;
    const otherTeam = r.onTeam1 ? r.game.team2 : r.game.team1;
    bump(partnerCounts, myTeam);
    bump(opponentCounts, otherTeam);
  }

  return {
    record,
    byType,
    form,
    partners: tallyTop(partnerCounts),
    opponents: tallyTop(opponentCounts),
  };
}
