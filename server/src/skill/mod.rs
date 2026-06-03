//! Pluggable skill-rating models.
//!
//! The rating algorithm is a swappable component behind one trait so that
//! matchmaking and persistence never depend on a specific algorithm (fixes the
//! "lock-in" bug in `docs/rebuild/06-skill-model.md`). All math here is pure and
//! IO-free — the DB load/save lives in `domain::games` / `domain::elo`.
//!
//! Three implementations live behind [`RatingModel`]:
//! - [`elo::EloModel`] — the legacy Elo + margin-of-victory math, retained as a
//!   parity / A-B baseline (with the win-by-1 quirk fixed in `crate::rating`).
//! - [`wenglin::WengLinModel`] — OpenSkill-style Bayesian model (license-clean,
//!   *not* patented TrueSkill); native multiplayer, per-player μ/σ credit. The
//!   default for new game types.
//! - [`glicko2::Glicko2Model`] — Glicko-2 (rating deviation + volatility) for
//!   1v1-dominant sports.

pub mod elo;
pub mod glicko2;
pub mod wenglin;

use serde_json::Value;

/// Model-agnostic per-`(user, game_type)` skill state.
#[derive(Debug, Clone, PartialEq)]
pub struct SkillState {
    /// Skill estimate (Elo uses this as the rating).
    pub mu: f64,
    /// Uncertainty (Elo uses a constant placeholder; Bayesian models shrink it).
    pub sigma: f64,
    /// Games played — drives cold-start and decay.
    pub games_played: u32,
    /// Model-specific fields (e.g. Glicko-2 volatility) as JSON.
    pub extra: Value,
}

/// The skill states of one team's players, in roster order.
#[derive(Debug, Clone)]
pub struct TeamSkills(pub Vec<SkillState>);

impl TeamSkills {
    /// Sum of player skill estimates (team strength).
    fn mu_sum(&self) -> f64 {
        self.0.iter().map(|s| s.mu).sum()
    }

    /// Sum of player variances (team uncertainty).
    fn sigma_sq_sum(&self) -> f64 {
        self.0.iter().map(|s| s.sigma * s.sigma).sum()
    }
}

/// A pluggable rating algorithm. Matchmaking depends only on [`expected_score`]
/// (+ `sigma`); persistence depends only on [`SkillState`].
///
/// `Send + Sync` so a boxed model can be held across `.await` points in the
/// async request handlers.
///
/// [`expected_score`]: RatingModel::expected_score
pub trait RatingModel: Send + Sync {
    /// The stable identifier persisted in `elo.model_version`.
    fn version(&self) -> &'static str;

    /// The state assigned to a player who has never been rated (cold-start).
    fn default_state(&self) -> SkillState;

    /// Win probability of team `a` over team `b` — the ONLY thing matchmaking
    /// needs to balance teams.
    fn expected_score(&self, a: &TeamSkills, b: &TeamSkills) -> f64;

    /// Post-game update for two teams, `winners` first then `losers`. `margin`
    /// is the winners' score margin (e.g. `6.0` for 21–15); models that only use
    /// win/loss ignore it. Returns new states in `[winners, losers]` order, each
    /// in input roster order.
    fn update(
        &self,
        winners: &TeamSkills,
        losers: &TeamSkills,
        margin: f64,
    ) -> [Vec<SkillState>; 2];

    /// Conservative display/ladder value (e.g. `mu - 3*sigma`).
    fn conservative_rating(&self, s: &SkillState) -> f64;

    /// Inflate uncertainty for a player inactive for `days_inactive` days (lazy
    /// decay, applied at read time — no scheduler). Default: no decay.
    fn decay(&self, _s: &mut SkillState, _days_inactive: f64) {}
}

/// Resolve a persisted `model_version` to its [`RatingModel`]. Unknown versions
/// fall back to the default ([`wenglin`]) so a row can never become unreadable.
pub fn model_for(version: &str) -> Box<dyn RatingModel> {
    match version {
        elo::VERSION => Box::new(elo::EloModel),
        glicko2::VERSION => Box::new(glicko2::Glicko2Model),
        wenglin::VERSION => Box::new(wenglin::WengLinModel),
        _ => Box::new(wenglin::WengLinModel),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn model_for_resolves_each_version() {
        assert_eq!(model_for(elo::VERSION).version(), elo::VERSION);
        assert_eq!(model_for(glicko2::VERSION).version(), glicko2::VERSION);
        assert_eq!(model_for(wenglin::VERSION).version(), wenglin::VERSION);
    }

    #[test]
    fn unknown_version_falls_back_to_default() {
        assert_eq!(model_for("nope").version(), wenglin::VERSION);
    }
}
