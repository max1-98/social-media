//! Pure ELO rating math. Ports `backend/elo/services.py`:
//! `prob_win` (b = 1/300), `g`, `result`, `team1Win`, `scoreDifference`,
//! `update_elo` (k = 40). No I/O — unit-tested against the Python outputs on
//! identical inputs (the existing Django tests act as the oracle).
//!
//! `update_elo` in Django mutates `Elo` rows in place; the parity port keeps the
//! math pure by *returning* the new values ([`apply_elo_update`]). The DB load /
//! save lives in `domain::games` / `domain::elo`.

use crate::error::AppError;

/// Fixed K-factor (Django `update_elo`: `k = 40`).
pub const K_FACTOR: f64 = 40.0;

/// Rating-differential scaling factor (Django `prob_win`: `b = 1/300`).
const B: f64 = 1.0 / 300.0;

/// Probability that the player with `elo1` beats the player with `elo2`
/// (sigmoid). Mirrors `prob_win`.
pub fn prob_win(elo1: f64, elo2: f64) -> f64 {
    1.0 / (1.0 + (B * (elo2 - elo1)).exp())
}

/// Outcome multiplier as a step function of the score difference. Mirrors `g`.
pub fn g(score_difference: i64) -> f64 {
    if score_difference > 8 {
        1.0
    } else if score_difference > 4 {
        0.8
    } else if score_difference > 1 {
        0.650
    } else if score_difference > -5 {
        0.350
    } else if score_difference > -9 {
        0.200
    } else {
        0.0
    }
}

/// Elo-change outcome given a score difference and win probability `p`. Mirrors
/// `result`. Badminton and tennis share the same formula in the legacy code.
pub fn result(score_difference: i64, p: f64) -> f64 {
    g(score_difference) - p
}

/// Parse a `"team1,team2"` score string into the two integer scores.
fn parse_score(score: &str) -> Result<(i64, i64), AppError> {
    let mut parts = score.split(',');
    let (Some(a), Some(b), None) = (parts.next(), parts.next(), parts.next()) else {
        return Err(AppError::Validation("Score must be 'team1,team2'.".into()));
    };
    let a = a
        .trim()
        .parse::<i64>()
        .map_err(|_| AppError::Validation("Scores must be integers.".into()))?;
    let b = b
        .trim()
        .parse::<i64>()
        .map_err(|_| AppError::Validation("Scores must be integers.".into()))?;
    Ok((a, b))
}

/// True if team 1 won (`team1_score > team2_score`). Mirrors `team1Win`.
pub fn team1_win(score: &str) -> Result<bool, AppError> {
    let (a, b) = parse_score(score)?;
    Ok(a > b)
}

/// Absolute score difference used in the Elo calculation. Mirrors
/// `scoreDifference`.
pub fn score_difference(score: &str) -> Result<i64, AppError> {
    let (a, b) = parse_score(score)?;
    Ok((a - b).abs())
}

/// A player's rating state going into a game.
#[derive(Debug, Clone, Copy)]
pub struct PlayerElo {
    pub elo: i64,
    pub winstreak: i64,
    pub best_winstreak: i64,
}

/// The recomputed rating state after a game.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EloOutcome {
    pub elo: i64,
    pub winstreak: i64,
    pub best_winstreak: i64,
}

/// New rating states for both teams after a completed game.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EloUpdate {
    pub winners: Vec<EloOutcome>,
    pub losers: Vec<EloOutcome>,
}

fn average_elo(team: &[PlayerElo]) -> f64 {
    let sum: i64 = team.iter().map(|p| p.elo).sum();
    sum as f64 / team.len() as f64
}

/// Pure port of `update_elo`. `winners` / `losers` are the rating states of the
/// teams (winners already determined via [`team1_win`]); `diff` is the positive
/// [`score_difference`]. With `sbmm` off only winstreaks change, never the elo —
/// matching the Django behaviour.
///
/// Truncation matches Python's `int()` (toward zero): elos stay positive, so the
/// `as i64` cast on the (positive) float is equivalent.
pub fn apply_elo_update(
    winners: &[PlayerElo],
    losers: &[PlayerElo],
    diff: i64,
    sbmm: bool,
) -> EloUpdate {
    let (win_change, lose_change) = if sbmm && !winners.is_empty() && !losers.is_empty() {
        let elow_avg = average_elo(winners);
        let elol_avg = average_elo(losers);
        let pw = prob_win(elow_avg, elol_avg);
        let pl = prob_win(elol_avg, elow_avg);
        (Some(result(diff, pw)), Some(result(-diff, pl)))
    } else {
        (None, None)
    };

    let winners_out = winners
        .iter()
        .map(|p| {
            let elo = match win_change {
                Some(c) => (p.elo as f64 + K_FACTOR * c) as i64,
                None => p.elo,
            };
            let winstreak = p.winstreak + 1;
            let best_winstreak = winstreak.max(p.best_winstreak);
            EloOutcome {
                elo,
                winstreak,
                best_winstreak,
            }
        })
        .collect();

    let losers_out = losers
        .iter()
        .map(|p| {
            let elo = match lose_change {
                Some(c) => (p.elo as f64 + K_FACTOR * c) as i64,
                None => p.elo,
            };
            EloOutcome {
                elo,
                winstreak: 0,
                best_winstreak: p.best_winstreak,
            }
        })
        .collect();

    EloUpdate {
        winners: winners_out,
        losers: losers_out,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- prob_win (oracle: elo/tests/test_services.py::TestProbWin) ---

    #[test]
    fn equal_elo_returns_half() {
        assert!((prob_win(1000.0, 1000.0) - 0.5).abs() < 0.001);
    }

    #[test]
    fn higher_elo_favored() {
        assert!(prob_win(1200.0, 1000.0) > 0.5);
    }

    #[test]
    fn lower_elo_disadvantaged() {
        assert!(prob_win(800.0, 1000.0) < 0.5);
    }

    #[test]
    fn probabilities_sum_to_one() {
        let p1 = prob_win(1100.0, 900.0);
        let p2 = prob_win(900.0, 1100.0);
        assert!((p1 + p2 - 1.0).abs() < 0.001);
    }

    // --- g boundaries ---

    #[test]
    fn g_step_boundaries() {
        assert_eq!(g(9), 1.0);
        assert_eq!(g(8), 0.8);
        assert_eq!(g(5), 0.8);
        assert_eq!(g(4), 0.650);
        assert_eq!(g(2), 0.650);
        assert_eq!(g(1), 0.350);
        assert_eq!(g(-4), 0.350);
        assert_eq!(g(-5), 0.200);
        assert_eq!(g(-8), 0.200);
        assert_eq!(g(-9), 0.0);
    }

    // --- team1_win / score_difference (oracle: TestTeam1Win, TestScoreDifference) ---

    #[test]
    fn team1_win_cases() {
        assert!(team1_win("21,15").unwrap());
        assert!(!team1_win("15,21").unwrap());
    }

    #[test]
    fn score_difference_cases() {
        assert_eq!(score_difference("21,15").unwrap(), 6);
        assert_eq!(score_difference("15,21").unwrap(), 6);
    }

    #[test]
    fn bad_score_is_validation_error() {
        assert!(matches!(team1_win("nope"), Err(AppError::Validation(_))));
        assert!(matches!(
            score_difference("21"),
            Err(AppError::Validation(_))
        ));
    }

    // --- apply_elo_update (oracle: TestUpdateElo) ---

    fn fresh(n: usize) -> Vec<PlayerElo> {
        vec![
            PlayerElo {
                elo: 1000,
                winstreak: 0,
                best_winstreak: 0,
            };
            n
        ]
    }

    #[test]
    fn updates_elo_with_sbmm() {
        let winners = fresh(2);
        let losers = fresh(2);
        let out = apply_elo_update(&winners, &losers, 6, true);

        for w in &out.winners {
            assert!(w.elo >= 1000);
            assert_eq!(w.winstreak, 1);
            assert_eq!(w.best_winstreak, 1);
        }
        for l in &out.losers {
            assert!(l.elo <= 1000);
            assert_eq!(l.winstreak, 0);
        }
    }

    #[test]
    fn updates_winstreak_without_sbmm() {
        let winners = fresh(2);
        let losers = fresh(2);
        let out = apply_elo_update(&winners, &losers, 6, false);

        for w in &out.winners {
            assert_eq!(w.elo, 1000);
            assert_eq!(w.winstreak, 1);
        }
        for l in &out.losers {
            assert_eq!(l.elo, 1000);
            assert_eq!(l.winstreak, 0);
        }
    }

    #[test]
    fn elo_change_is_symmetric_for_equal_teams() {
        // Equal teams, diff 6: g(6)=0.8, p=0.5 -> +0.3*40 = +12 ; losers -0.3*40 = -12.
        let out = apply_elo_update(&fresh(2), &fresh(2), 6, true);
        assert_eq!(out.winners[0].elo, 1012);
        assert_eq!(out.losers[0].elo, 988);
    }
}
