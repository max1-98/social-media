//! Pure matchmaking / team-balancing. Ports `backend/games/game_creation.py`:
//! `player_elo` (winstreak bonuses), `even_teams` (team balancing), `mixed_sbmm`,
//! `sbmm`, `social_count` (cubic), `social`. No I/O — the DB load / save lives in
//! `domain::games`.
//!
//! `even_teams` no longer ports the legacy simulated annealing (a degenerate,
//! near-random balancer — see `docs/rebuild/06-skill-model.md`); it now
//! enumerates every split and picks the most even one via the pluggable
//! `crate::skill` model, so balancing is deterministic and optimal.
//!
//! The *player-selection* steps still use Python's `random`, so exact output
//! parity is neither achievable nor meaningful. The RNG is injected
//! (`rng: &mut impl Rng`) so tests are reproducible, the deterministic helpers
//! (`player_elo`, `even_teams`, `social_count`) are oracle-tested, and the
//! stochastic fns are checked for invariants (team sizes, every player placed
//! exactly once, mixed-gender constraints).

use std::collections::HashMap;

use rand::seq::SliceRandom;
use rand::Rng;
use serde_json::Value;

use crate::error::AppError;
use crate::skill::elo::EloModel;
use crate::skill::{RatingModel, SkillState, TeamSkills};

/// Biological gender, used only by `mixed_sbmm` (per `.claude/rules/gdpr.md`,
/// minimise `biological_gender` usage to mixed SBMM).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Gender {
    Male,
    Female,
}

impl Gender {
    fn opposite(self) -> Self {
        match self {
            Gender::Male => Gender::Female,
            Gender::Female => Gender::Male,
        }
    }
}

/// A candidate player. `domain::games` builds these from the active members and
/// their `Elo` rows before calling a matchmaker.
#[derive(Debug, Clone, Copy)]
pub struct Player {
    pub id: i64,
    pub elo: i64,
    pub winstreak: i64,
    pub gender: Gender,
}

/// Winstreak-adjusted elo. Mirrors `player_elo`: `<3 → +0`, `<6 → +50`,
/// `<10 → +100`, else `+200`.
pub fn player_elo(p: &Player) -> i64 {
    if p.winstreak < 3 {
        p.elo
    } else if p.winstreak < 6 {
        p.elo + 50
    } else if p.winstreak < 10 {
        p.elo + 100
    } else {
        p.elo + 200
    }
}

/// Temperature schedule (`f(x) = 1/x`) used by the annealing loops.
fn temperature(x: usize) -> f64 {
    1.0 / x as f64
}

/// `ceil(team_size * k)` matching the Django `b` computation.
fn swap_count(team_size: usize, k: f64) -> usize {
    let v = team_size as f64 * k;
    if v.fract() == 0.0 {
        v as usize
    } else {
        v as usize + 1
    }
}

/// Split players into two balanced teams by **enumerating every possible split**
/// and keeping the one whose predicted win probability is closest to 50/50.
/// `players` is `(id, adjusted_elo)`.
///
/// This replaces the legacy simulated annealing, whose accept test
/// (`E_1 < E or math.exp(-E_1/T(i))`) was always true and which kept the *last*
/// swap rather than the *best* — so it returned a near-random split (documented
/// in `docs/rebuild/06-skill-model.md`). For the small team sizes here (2v2 → 3
/// splits, 3v3 → 10) full enumeration is deterministic, optimal, and cheap;
/// balance is scored through [`RatingModel::expected_score`] so the balancer
/// stays model-agnostic. Beyond [`ENUMERATION_LIMIT`] players it falls back to a
/// greedy sort-and-fill split to avoid the `2^n` blow-up.
pub fn even_teams(players: &[(i64, i64)]) -> (Vec<i64>, Vec<i64>) {
    let n = players.len();
    let half = n / 2;
    if half == 0 {
        return (players.iter().map(|(id, _)| *id).collect(), Vec::new());
    }
    if n > ENUMERATION_LIMIT {
        return greedy_split(players, half);
    }

    let model = EloModel;
    // Default to the natural split so we never need an `expect` on this path.
    let mut best_t1: Vec<i64> = players[..half].iter().map(|(id, _)| *id).collect();
    let mut best_t2: Vec<i64> = players[half..].iter().map(|(id, _)| *id).collect();
    let mut best_cost = f64::INFINITY;

    // Enumerate masks with exactly `half` bits set; require bit 0 set so each
    // partition (and its team-swapped twin) is scored exactly once.
    for mask in 0u32..(1u32 << n) {
        if mask.count_ones() as usize != half || mask & 1 == 0 {
            continue;
        }
        let mut t1 = Vec::with_capacity(half);
        let mut t2 = Vec::with_capacity(n - half);
        let mut s1 = Vec::with_capacity(half);
        let mut s2 = Vec::with_capacity(n - half);
        for (i, &(id, elo)) in players.iter().enumerate() {
            let state = elo_state(elo);
            if mask & (1 << i) != 0 {
                t1.push(id);
                s1.push(state);
            } else {
                t2.push(id);
                s2.push(state);
            }
        }
        let p = model.expected_score(&TeamSkills(s1), &TeamSkills(s2));
        let cost = (p - 0.5).abs();
        if cost < best_cost {
            best_cost = cost;
            best_t1 = t1;
            best_t2 = t2;
        }
    }

    (best_t1, best_t2)
}

/// Above this many players, enumeration (`2^n`) is skipped for a greedy split.
const ENUMERATION_LIMIT: usize = 12;

/// A [`SkillState`] carrying a matchmaking elo as its skill estimate (no
/// uncertainty — balancing only compares team strengths).
fn elo_state(elo: i64) -> SkillState {
    SkillState {
        mu: elo as f64,
        sigma: 0.0,
        games_played: 0,
        extra: Value::Null,
    }
}

/// Greedy balanced split for large rosters: assign players (strongest first) to
/// whichever team is currently weaker and not yet full.
fn greedy_split(players: &[(i64, i64)], half: usize) -> (Vec<i64>, Vec<i64>) {
    let mut sorted = players.to_vec();
    sorted.sort_by(|a, b| b.1.cmp(&a.1));
    let (mut t1, mut t2) = (Vec::with_capacity(half), Vec::new());
    let (mut s1, mut s2) = (0i64, 0i64);
    for (id, elo) in sorted {
        if t1.len() < half && (s1 <= s2 || t2.len() >= players.len() - half) {
            t1.push(id);
            s1 += elo;
        } else {
            t2.push(id);
            s2 += elo;
        }
    }
    (t1, t2)
}

/// Pick the `take` players whose adjusted elo is closest to `target`. Stable, so
/// ties keep input order (matches Python's stable `sorted`).
fn closest_by_elo(players: &[Player], target: i64, take: usize) -> Vec<Player> {
    let mut sorted = players.to_vec();
    sorted.sort_by_key(|p| (player_elo(p) - target).abs());
    sorted.truncate(take);
    sorted
}

/// Gender-aware 2v2 matchmaking. Mirrors `mixed_sbmm`.
///
/// Parity note: the opposite-gender trim threshold keys off the *same-gender*
/// candidate count in the Django source (`len(potential_players) < 5`); replicated
/// faithfully.
pub fn mixed_sbmm<R: Rng>(
    player_1: &Player,
    active: &[Player],
    rng: &mut R,
) -> Result<(Vec<i64>, Vec<i64>), AppError> {
    let p1_elo = player_elo(player_1);

    let same: Vec<Player> = active
        .iter()
        .filter(|p| p.gender == player_1.gender && p.id != player_1.id)
        .copied()
        .collect();
    let same_closest = if same.len() < 3 {
        same.clone()
    } else {
        closest_by_elo(&same, p1_elo, 2)
    };
    let partner_same = *same_closest
        .choose(rng)
        .ok_or_else(|| AppError::Validation("Not enough players for mixed matchmaking.".into()))?;

    let opp: Vec<Player> = active
        .iter()
        .filter(|p| p.gender == player_1.gender.opposite())
        .copied()
        .collect();
    let mut opp_closest = if same.len() < 5 {
        opp.clone()
    } else {
        closest_by_elo(&opp, p1_elo, 4)
    };
    if opp_closest.len() < 2 {
        return Err(AppError::Validation(
            "Not enough opposite-gender players for mixed matchmaking.".into(),
        ));
    }
    let i3 = rng.gen_range(0..opp_closest.len());
    let player3 = opp_closest.remove(i3);
    let i4 = rng.gen_range(0..opp_closest.len());
    let player4 = opp_closest.remove(i4);

    let mut t1 = vec![player_1.id];
    let mut t2 = vec![partner_same.id];
    // Assign the two opposite-gender players to balance the stronger seed.
    let (strong_to_t1, strong_to_t2) = if player3.elo > player4.elo {
        (player4, player3)
    } else {
        (player3, player4)
    };
    if player_elo(player_1) > player_elo(&partner_same) {
        t1.push(strong_to_t1.id);
        t2.push(strong_to_t2.id);
    } else {
        t2.push(strong_to_t1.id);
        t1.push(strong_to_t2.id);
    }
    Ok((t1, t2))
}

/// Non-mixed skill-based matchmaking. Mirrors `sbmm`.
pub fn sbmm<R: Rng>(
    player_1: &Player,
    active: &[Player],
    team_size: usize,
    rng: &mut R,
) -> Result<(Vec<i64>, Vec<i64>), AppError> {
    let p1_elo = player_elo(player_1);
    let potential: Vec<Player> = active
        .iter()
        .filter(|p| p.id != player_1.id)
        .copied()
        .collect();

    let mut closest = if potential.len() > 2 * team_size + 1 {
        closest_by_elo(&potential, p1_elo, 2 * team_size + 1)
    } else {
        potential
    };

    let mut chosen = vec![*player_1];
    let mut i = 0;
    while chosen.len() < 2 * team_size && i < 2 * team_size {
        if closest.is_empty() {
            break;
        }
        let idx = rng.gen_range(0..closest.len());
        chosen.push(closest.remove(idx));
        i += 1;
    }

    if chosen.len() < 2 * team_size {
        return Err(AppError::Validation(
            "Not enough players for matchmaking.".into(),
        ));
    }

    if team_size == 1 {
        return Ok((vec![chosen[0].id], vec![chosen[1].id]));
    }

    let pairs: Vec<(i64, i64)> = chosen.iter().map(|p| (p.id, player_elo(p))).collect();
    Ok(even_teams(&pairs))
}

/// Replay-penalty cost. Mirrors `social_count` with `G(x) = (x+1)^3`.
pub fn social_count(
    player_1: &Player,
    players: &[Player],
    played_with: &HashMap<i64, HashMap<i64, i64>>,
) -> i64 {
    fn g(x: i64) -> i64 {
        (x + 1).pow(3)
    }
    let count = |a: i64, b: i64| -> i64 {
        played_with
            .get(&a)
            .and_then(|m| m.get(&b))
            .copied()
            .unwrap_or(0)
    };

    let mut store = 0;
    for p in players {
        store += g(count(player_1.id, p.id));
    }
    for p in players {
        for q in players {
            store += g(count(p.id, q.id));
        }
    }
    store
}

/// Social matchmaking — minimises re-pairing. Mirrors `social`. `et` toggles the
/// final `even_teams` balancing pass.
pub fn social<R: Rng>(
    player_1: &Player,
    active: &[Player],
    played_with: &HashMap<i64, HashMap<i64, i64>>,
    team_size: usize,
    et: bool,
    rng: &mut R,
) -> Result<(Vec<i64>, Vec<i64>), AppError> {
    // Exact-fill fast path (everyone plays).
    if 2 * team_size == active.len() + 1 {
        let mut players: Vec<Player> = active.to_vec();
        players.push(*player_1);
        if team_size == 1 {
            return Ok((vec![players[0].id], vec![players[1].id]));
        }
        if et {
            let pairs: Vec<(i64, i64)> = players.iter().map(|p| (p.id, player_elo(p))).collect();
            return Ok(even_teams(&pairs));
        }
        let team1 = pick_team(&mut players, team_size, rng);
        return Ok((team1, players.iter().map(|p| p.id).collect()));
    }

    if active.len() < 2 * team_size - 1 {
        return Err(AppError::Validation(
            "Not enough players for social matchmaking.".into(),
        ));
    }

    let mut pool: Vec<Player> = active.to_vec();
    // Initial pick: keep the highest replay-cost sample (m = 1).
    let mut chosen: Vec<Player> = pool
        .choose_multiple(rng, 2 * team_size - 1)
        .copied()
        .collect();
    // Remove the chosen from the working pool.
    pool.retain(|p| !chosen.iter().any(|c| c.id == p.id));

    let mut energy = social_count(player_1, &chosen, played_with);
    let b = swap_count(team_size, 0.2);

    for i in 1..=10 {
        if pool.len() < b || chosen.len() < b {
            break;
        }
        let removals: Vec<Player> = chosen.choose_multiple(rng, b).copied().collect();
        let additions: Vec<Player> = pool.choose_multiple(rng, b).copied().collect();
        let mut candidate = chosen.clone();
        for r in &removals {
            candidate.retain(|p| p.id != r.id);
        }
        candidate.extend_from_slice(&additions);

        let e1 = social_count(player_1, &candidate, played_with);
        if e1 < energy || (-(e1 as f64) / temperature(i)).exp() > 0.5 {
            energy = e1;
            // Reflect the swap back into the working pool.
            for r in &removals {
                pool.push(*r);
            }
            pool.retain(|p| !additions.iter().any(|a| a.id == p.id));
            chosen = candidate;
        }
    }

    chosen.push(*player_1);
    if et {
        let pairs: Vec<(i64, i64)> = chosen.iter().map(|p| (p.id, player_elo(p))).collect();
        Ok(even_teams(&pairs))
    } else {
        let team1 = pick_team(&mut chosen, team_size, rng);
        Ok((team1, chosen.iter().map(|p| p.id).collect()))
    }
}

/// Remove `team_size` random players from `players`, returning their ids; the
/// remainder stays in `players`. Mirrors the `random.sample` + remove pattern.
fn pick_team<R: Rng>(players: &mut Vec<Player>, team_size: usize, rng: &mut R) -> Vec<i64> {
    let picks: Vec<Player> = players.choose_multiple(rng, team_size).copied().collect();
    let ids: Vec<i64> = picks.iter().map(|p| p.id).collect();
    players.retain(|p| !ids.contains(&p.id));
    ids
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::rngs::StdRng;
    use rand::SeedableRng;

    fn rng() -> StdRng {
        StdRng::seed_from_u64(42)
    }

    fn player(id: i64, elo: i64, winstreak: i64, gender: Gender) -> Player {
        Player {
            id,
            elo,
            winstreak,
            gender,
        }
    }

    // --- player_elo (deterministic oracle) ---

    #[test]
    fn player_elo_winstreak_bonus() {
        assert_eq!(player_elo(&player(1, 1000, 0, Gender::Male)), 1000);
        assert_eq!(player_elo(&player(1, 1000, 2, Gender::Male)), 1000);
        assert_eq!(player_elo(&player(1, 1000, 3, Gender::Male)), 1050);
        assert_eq!(player_elo(&player(1, 1000, 5, Gender::Male)), 1050);
        assert_eq!(player_elo(&player(1, 1000, 6, Gender::Male)), 1100);
        assert_eq!(player_elo(&player(1, 1000, 9, Gender::Male)), 1100);
        assert_eq!(player_elo(&player(1, 1000, 10, Gender::Male)), 1200);
    }

    // --- social_count (deterministic oracle) ---

    #[test]
    fn social_count_cubic_penalty() {
        let p1 = player(1, 1000, 0, Gender::Male);
        let players = vec![player(2, 1000, 0, Gender::Male)];
        // No history: G(0)=1 for (p1->2) plus the inner 2->2 self pair = 2.
        let empty: HashMap<i64, HashMap<i64, i64>> = HashMap::new();
        assert_eq!(social_count(&p1, &players, &empty), 2);

        // p1 has played player 2 three times: G(3)=64 for the p1->2 term.
        let mut pw: HashMap<i64, HashMap<i64, i64>> = HashMap::new();
        pw.insert(1, [(2, 3)].into());
        assert_eq!(social_count(&p1, &players, &pw), 64 + 1);
    }

    // --- even_teams (deterministic + optimal) ---

    #[test]
    fn even_teams_partitions_all_players() {
        let players: Vec<(i64, i64)> = vec![(1, 1000), (2, 1100), (3, 900), (4, 1050)];
        let (t1, t2) = even_teams(&players);
        assert_eq!(t1.len(), 2);
        assert_eq!(t2.len(), 2);
        let mut all: Vec<i64> = t1.into_iter().chain(t2).collect();
        all.sort_unstable();
        assert_eq!(all, vec![1, 2, 3, 4]);
    }

    #[test]
    fn even_teams_picks_the_most_balanced_split() {
        // Sums: {1,4}=2050 vs {2,3}=2000 (diff 50) is the most even of the three
        // possible splits, and the balancer must find it deterministically.
        let players: Vec<(i64, i64)> = vec![(1, 1000), (2, 1100), (3, 900), (4, 1050)];
        let (mut t1, mut t2) = even_teams(&players);
        t1.sort_unstable();
        t2.sort_unstable();
        assert_eq!(t1, vec![1, 4]);
        assert_eq!(t2, vec![2, 3]);
        // Stable across repeated calls (no RNG).
        let (a, _) = even_teams(&players);
        let mut a = a;
        a.sort_unstable();
        assert_eq!(a, vec![1, 4]);
    }

    #[test]
    fn even_teams_greedy_fallback_balances_large_rosters() {
        // Beyond ENUMERATION_LIMIT players the greedy path still splits evenly.
        let players: Vec<(i64, i64)> = (1..=14).map(|i| (i, 1000 + i * 10)).collect();
        let (t1, t2) = even_teams(&players);
        assert_eq!((t1.len(), t2.len()), (7, 7));
        let s1: i64 = t1.iter().map(|id| 1000 + id * 10).sum();
        let s2: i64 = t2.iter().map(|id| 1000 + id * 10).sum();
        assert!(
            (s1 - s2).abs() <= 20,
            "greedy split unbalanced: {s1} vs {s2}"
        );
    }

    // --- sbmm (invariants) ---

    #[test]
    fn sbmm_singles_returns_two_distinct() {
        let p1 = player(1, 1000, 0, Gender::Male);
        let active = vec![p1, player(2, 1010, 0, Gender::Male)];
        let (t1, t2) = sbmm(&p1, &active, 1, &mut rng()).unwrap();
        assert_eq!((t1.len(), t2.len()), (1, 1));
        assert_ne!(t1[0], t2[0]);
    }

    #[test]
    fn sbmm_doubles_balances_four() {
        let p1 = player(1, 1000, 0, Gender::Male);
        let active: Vec<Player> = (1..=6)
            .map(|i| player(i, 1000 + i * 10, 0, Gender::Male))
            .collect();
        let (t1, t2) = sbmm(&p1, &active, 2, &mut rng()).unwrap();
        assert_eq!((t1.len(), t2.len()), (2, 2));
        let mut all: Vec<i64> = t1.into_iter().chain(t2).collect();
        all.sort_unstable();
        all.dedup();
        assert_eq!(all.len(), 4);
        assert!(all.contains(&1));
    }

    #[test]
    fn sbmm_errors_when_too_few_players() {
        let p1 = player(1, 1000, 0, Gender::Male);
        let active = vec![p1];
        assert!(matches!(
            sbmm(&p1, &active, 2, &mut rng()),
            Err(AppError::Validation(_))
        ));
    }

    // --- mixed_sbmm (invariants + gender constraints) ---

    #[test]
    fn mixed_sbmm_builds_two_v_two_with_gender_mix() {
        let p1 = player(1, 1000, 0, Gender::Male);
        let active = vec![
            p1,
            player(2, 1010, 0, Gender::Male),
            player(3, 990, 0, Gender::Male),
            player(4, 1000, 0, Gender::Female),
            player(5, 1020, 0, Gender::Female),
            player(6, 980, 0, Gender::Female),
        ];
        let (t1, t2) = mixed_sbmm(&p1, &active, &mut rng()).unwrap();
        assert_eq!((t1.len(), t2.len()), (2, 2));
        let mut all: Vec<i64> = t1.iter().chain(&t2).copied().collect();
        all.sort_unstable();
        all.dedup();
        assert_eq!(all.len(), 4);
        assert!(all.contains(&1));
    }

    // --- social (invariants) ---

    #[test]
    fn social_partitions_players() {
        let p1 = player(1, 1000, 0, Gender::Male);
        let active: Vec<Player> = (2..=8).map(|i| player(i, 1000, 0, Gender::Male)).collect();
        let pw: HashMap<i64, HashMap<i64, i64>> = HashMap::new();
        let (t1, t2) = social(&p1, &active, &pw, 2, true, &mut rng()).unwrap();
        assert_eq!((t1.len(), t2.len()), (2, 2));
        let mut all: Vec<i64> = t1.into_iter().chain(t2).collect();
        all.sort_unstable();
        all.dedup();
        assert_eq!(all.len(), 4);
    }
}
