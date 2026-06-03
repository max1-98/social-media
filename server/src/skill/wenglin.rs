//! Weng-Lin / OpenSkill rating model (Bradley-Terry full-pairing).
//!
//! A Bayesian, TrueSkill-family model that carries skill `mu` + uncertainty
//! `sigma` per player. It is the default for new game types because it:
//! - is natively multiplayer / team-size-agnostic;
//! - gives **correct per-player credit** (the update is weighted by each
//!   player's variance, not the flat team-average delta Elo uses) — this fixes
//!   the documented "flat team credit" bug;
//! - carries real uncertainty, so cold-start, decay, and informative
//!   matchmaking fall out of `sigma`.
//!
//! License-clean: this is the open Weng-Lin formulation (Weng & Lin, 2011), not
//! Microsoft's patented TrueSkill. Reference math matches OpenSkill's
//! `BradleyTerryFull`.

use serde_json::Value;

use super::{RatingModel, SkillState, TeamSkills};

/// Persisted `model_version` for this model.
pub const VERSION: &str = "wenglin_bt_v1";

const MU0: f64 = 25.0;
const SIGMA0: f64 = MU0 / 3.0; // ≈ 8.333
const BETA: f64 = SIGMA0 / 2.0; // skill-to-chance scaling
const TAU: f64 = SIGMA0 / 100.0; // additive dynamics: a floor on certainty
const KAPPA: f64 = 1e-4; // keeps sigma strictly positive
/// A "normal" winning margin; the MOV weight is 1.0 here and scales (bounded)
/// either side of it.
const NORMAL_MARGIN: f64 = 6.0;

fn beta_sq() -> f64 {
    BETA * BETA
}

/// Bounded margin-of-victory weight on the mean shift: a blowout moves ratings
/// more, a nail-biter less, but the sign never flips (so a 1-point win is still
/// a gain). Centred at 1.0 for a `NORMAL_MARGIN` win.
fn mov_weight(margin: f64) -> f64 {
    (0.5 + 0.5 * margin.max(0.0) / NORMAL_MARGIN).clamp(0.5, 1.5)
}

/// The Weng-Lin / OpenSkill Bradley-Terry (full-pairing) model.
#[derive(Debug, Default, Clone, Copy)]
pub struct WengLinModel;

/// `(mu_sum, sigma_sq_sum)` for a team, with `tau` dynamics already folded into
/// each player's variance.
fn team_rating(team: &TeamSkills) -> (f64, f64) {
    let mu = team.mu_sum();
    let sigma_sq: f64 = team.0.iter().map(|s| s.sigma * s.sigma + TAU * TAU).sum();
    (mu, sigma_sq)
}

impl WengLinModel {
    /// Apply the per-team `omega` (mean shift) / `eta` (variance shrink) to each
    /// player, weighted by that player's share of the team variance.
    fn apply(team: &TeamSkills, team_sigma_sq: f64, omega: f64, eta: f64) -> Vec<SkillState> {
        team.0
            .iter()
            .map(|s| {
                let player_sigma_sq = s.sigma * s.sigma + TAU * TAU;
                let share = player_sigma_sq / team_sigma_sq;
                let new_mu = s.mu + share * omega;
                let new_sigma = player_sigma_sq.sqrt() * (1.0 - share * eta).max(KAPPA).sqrt();
                SkillState {
                    mu: new_mu,
                    sigma: new_sigma,
                    games_played: s.games_played + 1,
                    extra: s.extra.clone(),
                }
            })
            .collect()
    }
}

impl RatingModel for WengLinModel {
    fn version(&self) -> &'static str {
        VERSION
    }

    fn default_state(&self) -> SkillState {
        SkillState {
            mu: MU0,
            sigma: SIGMA0,
            games_played: 0,
            extra: Value::Null,
        }
    }

    fn expected_score(&self, a: &TeamSkills, b: &TeamSkills) -> f64 {
        let (a_mu, a_sig) = team_rating(a);
        let (b_mu, b_sig) = team_rating(b);
        let c = (a_sig + b_sig + 2.0 * beta_sq()).sqrt();
        1.0 / (1.0 + ((b_mu - a_mu) / c).exp())
    }

    fn update(
        &self,
        winners: &TeamSkills,
        losers: &TeamSkills,
        margin: f64,
    ) -> [Vec<SkillState>; 2] {
        let (w_mu, w_sig) = team_rating(winners);
        let (l_mu, l_sig) = team_rating(losers);
        let c = (w_sig + l_sig + 2.0 * beta_sq()).sqrt();
        let weight = mov_weight(margin);

        // Probability the winning team beats the losing team.
        let p_win = 1.0 / (1.0 + ((l_mu - w_mu) / c).exp());

        // Winners: score 1, losers: score 0 (full-pairing, two teams).
        let omega_w = (w_sig / c) * (1.0 - p_win) * weight;
        let omega_l = (l_sig / c) * (0.0 - (1.0 - p_win)) * weight;
        let gamma_w = w_sig.sqrt() / c;
        let gamma_l = l_sig.sqrt() / c;
        let var_term = p_win * (1.0 - p_win);
        let eta_w = gamma_w * (w_sig / (c * c)) * var_term;
        let eta_l = gamma_l * (l_sig / (c * c)) * var_term;

        [
            Self::apply(winners, w_sig, omega_w, eta_w),
            Self::apply(losers, l_sig, omega_l, eta_l),
        ]
    }

    fn conservative_rating(&self, s: &SkillState) -> f64 {
        s.mu - 3.0 * s.sigma
    }

    fn decay(&self, s: &mut SkillState, days_inactive: f64) {
        if days_inactive <= 0.0 {
            return;
        }
        // Lazy decay: inflate sigma toward the prior, capped at SIGMA0.
        let grown = (s.sigma * s.sigma + TAU * TAU * days_inactive).sqrt();
        s.sigma = grown.min(SIGMA0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn team(states: &[(f64, f64)]) -> TeamSkills {
        TeamSkills(
            states
                .iter()
                .map(|&(mu, sigma)| SkillState {
                    mu,
                    sigma,
                    games_played: 0,
                    extra: Value::Null,
                })
                .collect(),
        )
    }

    fn default_team(n: usize) -> TeamSkills {
        team(&vec![(MU0, SIGMA0); n])
    }

    #[test]
    fn equal_teams_expect_half() {
        let p = WengLinModel.expected_score(&default_team(1), &default_team(1));
        assert!((p - 0.5).abs() < 1e-9);
    }

    /// Reference vector: a default 1v1 game under OpenSkill BradleyTerryFull
    /// moves the winner to ~27.635 and the loser to ~22.365, both sigma ~8.066.
    /// `margin = NORMAL_MARGIN` makes the MOV weight exactly 1.0.
    #[test]
    fn one_v_one_reference_vector() {
        let [w, l] = WengLinModel.update(&default_team(1), &default_team(1), NORMAL_MARGIN);
        assert!((w[0].mu - 27.6354).abs() < 0.01, "winner mu = {}", w[0].mu);
        assert!((l[0].mu - 22.3646).abs() < 0.01, "loser mu = {}", l[0].mu);
        assert!(
            (w[0].sigma - 8.0658).abs() < 0.01,
            "winner sigma = {}",
            w[0].sigma
        );
        assert!(
            (l[0].sigma - 8.0658).abs() < 0.01,
            "loser sigma = {}",
            l[0].sigma
        );
    }

    #[test]
    fn winner_gains_loser_loses_and_uncertainty_shrinks() {
        let [w, l] = WengLinModel.update(&default_team(2), &default_team(2), NORMAL_MARGIN);
        for p in &w {
            assert!(p.mu > MU0);
            assert!(p.sigma < SIGMA0);
            assert_eq!(p.games_played, 1);
        }
        for p in &l {
            assert!(p.mu < MU0);
            assert!(p.sigma < SIGMA0);
        }
    }

    /// Per-player credit: a high-uncertainty teammate moves more than a settled
    /// one on the same win — the fix for the flat-team-credit bug.
    #[test]
    fn credit_is_weighted_by_uncertainty() {
        let winners = team(&[(MU0, SIGMA0), (MU0, SIGMA0 / 4.0)]);
        let [w, _] = WengLinModel.update(&winners, &default_team(2), NORMAL_MARGIN);
        let high_unc_gain = w[0].mu - MU0;
        let low_unc_gain = w[1].mu - MU0;
        assert!(high_unc_gain > low_unc_gain);
    }

    #[test]
    fn win_by_one_is_still_a_gain() {
        let [w, l] = WengLinModel.update(&default_team(1), &default_team(1), 1.0);
        assert!(w[0].mu > MU0);
        assert!(l[0].mu < MU0);
    }

    #[test]
    fn decay_inflates_sigma_up_to_prior() {
        let mut s = SkillState {
            mu: 30.0,
            sigma: 2.0,
            games_played: 50,
            extra: Value::Null,
        };
        WengLinModel.decay(&mut s, 100.0);
        assert!(s.sigma > 2.0);
        assert!(s.sigma <= SIGMA0);
    }

    #[test]
    fn conservative_rating_penalises_uncertainty() {
        let settled = SkillState {
            mu: 30.0,
            sigma: 2.0,
            games_played: 50,
            extra: Value::Null,
        };
        let green = SkillState {
            mu: 30.0,
            sigma: 8.0,
            games_played: 1,
            extra: Value::Null,
        };
        assert!(
            WengLinModel.conservative_rating(&settled) > WengLinModel.conservative_rating(&green)
        );
    }
}
