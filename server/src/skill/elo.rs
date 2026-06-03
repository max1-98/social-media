//! Elo + margin-of-victory model.
//!
//! Wraps the pure math in [`crate::rating`] behind [`RatingModel`], retained as
//! a parity / A-B baseline. Elo carries no real uncertainty, so `sigma` is a
//! constant placeholder and credit is flat across a team (its known limitation —
//! the per-player-credit fix lives in [`super::wenglin`]). The win-by-1
//! margin-of-victory bug is fixed in [`crate::rating::g`].

use serde_json::Value;

use super::{RatingModel, SkillState, TeamSkills};
use crate::rating::{prob_win, result, K_FACTOR};

/// Persisted `model_version` for this model.
pub const VERSION: &str = "elo_mov_v1";

/// Starting rating for an unrated player (legacy default).
const DEFAULT_ELO: f64 = 1000.0;
/// Elo has no uncertainty; a zero placeholder keeps the shared `SkillState`
/// shape meaningful (`conservative_rating` is just `mu`).
const ELO_SIGMA: f64 = 0.0;

/// The legacy Elo + MOV rating model.
#[derive(Debug, Default, Clone, Copy)]
pub struct EloModel;

impl EloModel {
    fn team_avg(team: &TeamSkills) -> f64 {
        team.mu_sum() / team.0.len().max(1) as f64
    }

    fn changed(team: &TeamSkills, delta: f64) -> Vec<SkillState> {
        team.0
            .iter()
            .map(|s| SkillState {
                mu: s.mu + delta,
                sigma: s.sigma,
                games_played: s.games_played + 1,
                extra: s.extra.clone(),
            })
            .collect()
    }
}

impl RatingModel for EloModel {
    fn version(&self) -> &'static str {
        VERSION
    }

    fn default_state(&self) -> SkillState {
        SkillState {
            mu: DEFAULT_ELO,
            sigma: ELO_SIGMA,
            games_played: 0,
            extra: Value::Null,
        }
    }

    fn expected_score(&self, a: &TeamSkills, b: &TeamSkills) -> f64 {
        prob_win(Self::team_avg(a), Self::team_avg(b))
    }

    fn update(
        &self,
        winners: &TeamSkills,
        losers: &TeamSkills,
        margin: f64,
    ) -> [Vec<SkillState>; 2] {
        let avg_w = Self::team_avg(winners);
        let avg_l = Self::team_avg(losers);
        let diff = margin.round() as i64;
        let win_change = K_FACTOR * result(diff, prob_win(avg_w, avg_l));
        let lose_change = K_FACTOR * result(-diff, prob_win(avg_l, avg_w));
        [
            Self::changed(winners, win_change),
            Self::changed(losers, lose_change),
        ]
    }

    fn conservative_rating(&self, s: &SkillState) -> f64 {
        s.mu
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn team(mus: &[f64]) -> TeamSkills {
        TeamSkills(
            mus.iter()
                .map(|&mu| SkillState {
                    mu,
                    sigma: ELO_SIGMA,
                    games_played: 0,
                    extra: Value::Null,
                })
                .collect(),
        )
    }

    #[test]
    fn equal_teams_expect_half() {
        assert!((EloModel.expected_score(&team(&[1000.0]), &team(&[1000.0])) - 0.5).abs() < 1e-9);
    }

    #[test]
    fn win_by_one_is_a_gain() {
        // Regression for the documented MOV bug, exercised through the model.
        let [w, l] = EloModel.update(&team(&[1000.0]), &team(&[1000.0]), 1.0);
        assert!(w[0].mu > 1000.0);
        assert!(l[0].mu < 1000.0);
    }

    #[test]
    fn conservative_rating_is_mu() {
        let s = EloModel.default_state();
        assert_eq!(EloModel.conservative_rating(&s), DEFAULT_ELO);
    }
}
