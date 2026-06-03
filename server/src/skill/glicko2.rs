//! Glicko-2 rating model (Glickman, 2013).
//!
//! Adds rating deviation (RD) and volatility on top of a rating: real
//! cold-start (high RD), inactivity decay (RD grows over time), and confidence
//! intervals. Natively a 1v1 model; team games are handled by averaging the
//! opposing team into a single virtual opponent (per the comparison doc).
//! Best suited to 1v1-dominant sports; it also proves the trait abstraction by
//! living behind the same [`RatingModel`] seam as Elo and Weng-Lin.
//!
//! `SkillState` mapping: `mu` = rating (1500 scale), `sigma` = RD, and the
//! per-player volatility is carried in `extra` as `{"vol": f64}`.

use serde_json::{json, Value};

use super::{RatingModel, SkillState, TeamSkills};

/// Persisted `model_version` for this model.
pub const VERSION: &str = "glicko2_v1";

const RATING0: f64 = 1500.0;
const RD0: f64 = 350.0;
const VOL0: f64 = 0.06;
/// Glicko-2 ↔ Glicko-1 scale factor.
const SCALE: f64 = 173.7178;
/// System constant (constrains volatility change). Glickman's worked example.
const TAU_SYS: f64 = 0.5;
const CONVERGENCE: f64 = 1e-6;

fn g_phi(phi: f64) -> f64 {
    use std::f64::consts::PI;
    1.0 / (1.0 + 3.0 * phi * phi / (PI * PI)).sqrt()
}

fn expect(mu: f64, mu_j: f64, phi_j: f64) -> f64 {
    1.0 / (1.0 + (-g_phi(phi_j) * (mu - mu_j)).exp())
}

/// One Glicko-2 update of `(rating, rd, vol)` against a list of
/// `(opponent_rating, opponent_rd, score)` results. `score` is 1.0 win / 0.0
/// loss. Pure; this is the reference implementation the trait delegates to.
fn glicko2_update(rating: f64, rd: f64, vol: f64, games: &[(f64, f64, f64)]) -> (f64, f64, f64) {
    // Unrated/idle period: only RD changes (decay handled by `decay`).
    if games.is_empty() {
        return (rating, rd, vol);
    }
    let mu = (rating - RATING0) / SCALE;
    let phi = rd / SCALE;

    let mut v_inv = 0.0;
    let mut delta_sum = 0.0;
    for &(r_j, rd_j, s_j) in games {
        let mu_j = (r_j - RATING0) / SCALE;
        let phi_j = rd_j / SCALE;
        let g_j = g_phi(phi_j);
        let e_j = expect(mu, mu_j, phi_j);
        v_inv += g_j * g_j * e_j * (1.0 - e_j);
        delta_sum += g_j * (s_j - e_j);
    }
    let v = 1.0 / v_inv;
    let delta = v * delta_sum;

    // Solve for the new volatility via the Illinois algorithm.
    let new_vol = solve_volatility(phi, v, delta, vol);

    let phi_star = (phi * phi + new_vol * new_vol).sqrt();
    let new_phi = 1.0 / ((1.0 / (phi_star * phi_star)) + (1.0 / v)).sqrt();
    let new_mu = mu + new_phi * new_phi * delta_sum;

    (RATING0 + SCALE * new_mu, SCALE * new_phi, new_vol)
}

fn solve_volatility(phi: f64, v: f64, delta: f64, vol: f64) -> f64 {
    let a = (vol * vol).ln();
    let f = |x: f64| {
        let ex = x.exp();
        let num = ex * (delta * delta - phi * phi - v - ex);
        let den = 2.0 * (phi * phi + v + ex).powi(2);
        num / den - (x - a) / (TAU_SYS * TAU_SYS)
    };

    let mut big_a = a;
    let mut big_b = if delta * delta > phi * phi + v {
        (delta * delta - phi * phi - v).ln()
    } else {
        let mut k = 1.0;
        while f(a - k * TAU_SYS) < 0.0 {
            k += 1.0;
        }
        a - k * TAU_SYS
    };

    let mut f_a = f(big_a);
    let mut f_b = f(big_b);
    while (big_b - big_a).abs() > CONVERGENCE {
        let c = big_a + (big_a - big_b) * f_a / (f_b - f_a);
        let f_c = f(c);
        if f_c * f_b <= 0.0 {
            big_a = big_b;
            f_a = f_b;
        } else {
            f_a /= 2.0;
        }
        big_b = c;
        f_b = f_c;
    }
    (big_a / 2.0).exp()
}

/// The Glicko-2 rating model.
#[derive(Debug, Default, Clone, Copy)]
pub struct Glicko2Model;

fn vol_of(s: &SkillState) -> f64 {
    s.extra.get("vol").and_then(Value::as_f64).unwrap_or(VOL0)
}

fn team_avg(team: &TeamSkills) -> (f64, f64) {
    let n = team.0.len().max(1) as f64;
    let rating = team.mu_sum() / n;
    let rd = (team.sigma_sq_sum() / n).sqrt();
    (rating, rd)
}

impl Glicko2Model {
    fn update_team(team: &TeamSkills, opp: (f64, f64), score: f64) -> Vec<SkillState> {
        team.0
            .iter()
            .map(|s| {
                let (r, rd, vol) =
                    glicko2_update(s.mu, s.sigma, vol_of(s), &[(opp.0, opp.1, score)]);
                SkillState {
                    mu: r,
                    sigma: rd,
                    games_played: s.games_played + 1,
                    extra: json!({ "vol": vol }),
                }
            })
            .collect()
    }
}

impl RatingModel for Glicko2Model {
    fn version(&self) -> &'static str {
        VERSION
    }

    fn default_state(&self) -> SkillState {
        SkillState {
            mu: RATING0,
            sigma: RD0,
            games_played: 0,
            extra: json!({ "vol": VOL0 }),
        }
    }

    fn expected_score(&self, a: &TeamSkills, b: &TeamSkills) -> f64 {
        let (r_a, rd_a) = team_avg(a);
        let (r_b, rd_b) = team_avg(b);
        let mu_a = (r_a - RATING0) / SCALE;
        let mu_b = (r_b - RATING0) / SCALE;
        let phi_a = rd_a / SCALE;
        let phi_b = rd_b / SCALE;
        // Fold both teams' uncertainty into the comparison.
        let phi = (phi_a * phi_a + phi_b * phi_b).sqrt();
        1.0 / (1.0 + (-g_phi(phi) * (mu_a - mu_b)).exp())
    }

    fn update(
        &self,
        winners: &TeamSkills,
        losers: &TeamSkills,
        _margin: f64,
    ) -> [Vec<SkillState>; 2] {
        let w_opp = team_avg(losers);
        let l_opp = team_avg(winners);
        [
            Self::update_team(winners, w_opp, 1.0),
            Self::update_team(losers, l_opp, 0.0),
        ]
    }

    fn conservative_rating(&self, s: &SkillState) -> f64 {
        // RD-based lower confidence bound.
        s.mu - 2.0 * s.sigma
    }

    fn decay(&self, s: &mut SkillState, days_inactive: f64) {
        if days_inactive <= 0.0 {
            return;
        }
        let phi = s.sigma / SCALE;
        let vol = vol_of(s);
        let grown = (phi * phi + vol * vol * days_inactive).sqrt();
        s.sigma = (SCALE * grown).min(RD0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Glickman's published worked example: a player (1500, RD 200, vol 0.06)
    /// plays three opponents and should end at rating ≈ 1464.06, RD ≈ 151.52,
    /// vol ≈ 0.05999.
    #[test]
    fn glickman_worked_example() {
        let games = [
            (1400.0, 30.0, 1.0),
            (1550.0, 100.0, 0.0),
            (1700.0, 300.0, 0.0),
        ];
        let (r, rd, vol) = glicko2_update(1500.0, 200.0, 0.06, &games);
        assert!((r - 1464.06).abs() < 0.05, "rating = {r}");
        assert!((rd - 151.52).abs() < 0.05, "rd = {rd}");
        assert!((vol - 0.05999).abs() < 1e-4, "vol = {vol}");
    }

    #[test]
    fn equal_teams_expect_half() {
        let p = Glicko2Model.expected_score(&team(1), &team(1));
        assert!((p - 0.5).abs() < 1e-9);
    }

    fn team(n: usize) -> TeamSkills {
        TeamSkills(vec![Glicko2Model.default_state(); n])
    }

    #[test]
    fn winner_gains_and_rd_shrinks() {
        let [w, l] = Glicko2Model.update(&team(1), &team(1), 6.0);
        assert!(w[0].mu > RATING0);
        assert!(l[0].mu < RATING0);
        assert!(w[0].sigma < RD0);
        assert_eq!(w[0].games_played, 1);
    }

    #[test]
    fn decay_grows_rd_up_to_prior() {
        let mut s = SkillState {
            mu: 1600.0,
            sigma: 50.0,
            games_played: 30,
            extra: json!({ "vol": VOL0 }),
        };
        Glicko2Model.decay(&mut s, 60.0);
        assert!(s.sigma > 50.0);
        assert!(s.sigma <= RD0);
    }
}
