//! Pure ELO rating primitives. Ports `backend/elo/services.py`:
//! `prob_win` (b = 1/300), `g`, `result`, `team1Win`, `scoreDifference`,
//! `update_elo` (k = 40). No I/O — unit-tested against the Python outputs on
//! identical inputs (the existing Django tests act as the oracle).
//!
//! The post-game rating update lives behind the pluggable
//! [`crate::skill::RatingModel`] trait; [`crate::skill::elo::EloModel`] composes
//! the `prob_win` / `result` / `K_FACTOR` primitives here. This module keeps the
//! score parsing (`team1_win`, `score_difference`) used by `domain::games`.

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

/// Outcome multiplier as a step function of the score difference.
///
/// Diverges from the legacy `g` to fix the documented margin-of-victory bug
/// (`docs/rebuild/06-skill-model.md`): the old buckets were not zero-sum and a
/// win by exactly one point mapped to `0.35`, producing a *negative* rating
/// change for the winner against an equal opponent. The replacement is
/// symmetric — `g(d) + g(-d) == 1` for every `d`, so equal-strength games stay
/// zero-sum — and any win (`d >= 1`) yields `g > 0.5`, so a 1-point win is
/// always a (small) gain.
pub fn g(score_difference: i64) -> f64 {
    if score_difference >= 9 {
        0.95
    } else if score_difference >= 5 {
        0.80
    } else if score_difference >= 2 {
        0.65
    } else if score_difference == 1 {
        0.55
    } else if score_difference == 0 {
        0.50
    } else if score_difference == -1 {
        0.45
    } else if score_difference >= -4 {
        0.35
    } else if score_difference >= -8 {
        0.20
    } else {
        0.05
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
        assert_eq!(g(9), 0.95);
        assert_eq!(g(8), 0.80);
        assert_eq!(g(5), 0.80);
        assert_eq!(g(4), 0.65);
        assert_eq!(g(2), 0.65);
        assert_eq!(g(1), 0.55);
        assert_eq!(g(0), 0.50);
        assert_eq!(g(-1), 0.45);
        assert_eq!(g(-4), 0.35);
        assert_eq!(g(-5), 0.20);
        assert_eq!(g(-8), 0.20);
        assert_eq!(g(-9), 0.05);
    }

    #[test]
    fn g_is_zero_sum() {
        for d in -25..=25 {
            assert!((g(d) + g(-d) - 1.0).abs() < 1e-9, "g({d}) not zero-sum");
        }
    }

    /// Regression for the documented bug: the outcome term for a win by exactly
    /// one point against an equal opponent must be positive (the
    /// `EloModel::update` path asserts the full rating change in `skill::elo`).
    #[test]
    fn win_by_one_outcome_is_positive_for_equal_opponent() {
        let p = prob_win(1000.0, 1000.0); // 0.5
        assert!(
            result(1, p) > 0.0,
            "win-by-1 vs equal opponent went negative"
        );
        // A "normal" win (diff 6) still gives the legacy ±12 swing: g(6)=0.80,
        // p=0.5 -> result = 0.30, ×K(40) = 12.
        assert!((K_FACTOR * result(6, p) - 12.0).abs() < 1e-9);
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
}
