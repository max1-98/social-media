//! Club-level rating update (Phase 9, club-vs-club fixtures).
//!
//! Clubs carry their own per-`(club, game_type)` skill state in `club_elo`,
//! driven by the SAME pluggable [`crate::skill::RatingModel`] as players — a
//! club is modelled as a single "player" whose `mu`/`sigma`/`games_played`/
//! `extra` are the club's. When a fixture settles (both clubs confirm), the
//! winning club is the one that won more of the linked games; the model's
//! `update` then moves both clubs' states.
//!
//! The math here is pure and IO-free so it can be oracle-tested; the DB
//! load/save lives in [`crate::domain::fixtures`].

use crate::skill::{RatingModel, SkillState, TeamSkills};

/// A club's persisted skill state plus its display ladder value.
#[derive(Debug, Clone, PartialEq)]
pub struct ClubRating {
    pub state: SkillState,
    /// Conservative display value (`round(conservative_rating)`).
    pub elo: i64,
}

/// Outcome of a settled fixture, from the home club's perspective.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FixtureOutcome {
    HomeWin,
    AwayWin,
    /// Equal games each — no rating movement (clubs are unranked on a draw).
    Draw,
}

/// Decide the fixture outcome from the per-club game tallies.
pub fn outcome(home_games_won: u32, away_games_won: u32) -> FixtureOutcome {
    match home_games_won.cmp(&away_games_won) {
        std::cmp::Ordering::Greater => FixtureOutcome::HomeWin,
        std::cmp::Ordering::Less => FixtureOutcome::AwayWin,
        std::cmp::Ordering::Equal => FixtureOutcome::Draw,
    }
}

/// Pure club-vs-club rating update.
///
/// `margin` is the winners' game-count margin (e.g. `2.0` for a 3–1 fixture);
/// it feeds the model's margin-of-victory weighting exactly like a per-game
/// score margin. On a [`FixtureOutcome::Draw`] the states are returned
/// unchanged. Returns `(new_home, new_away)`.
pub fn update_clubs(
    model: &dyn RatingModel,
    home: &SkillState,
    away: &SkillState,
    outcome: FixtureOutcome,
    margin: f64,
) -> (ClubRating, ClubRating) {
    let (winner, loser) = match outcome {
        FixtureOutcome::HomeWin => (home, away),
        FixtureOutcome::AwayWin => (away, home),
        FixtureOutcome::Draw => {
            return (rating(model, home), rating(model, away));
        }
    };

    let win_team = TeamSkills(vec![winner.clone()]);
    let lose_team = TeamSkills(vec![loser.clone()]);
    let [w, l] = model.update(&win_team, &lose_team, margin);
    let (new_winner, new_loser) = (rating(model, &w[0]), rating(model, &l[0]));

    match outcome {
        FixtureOutcome::HomeWin => (new_winner, new_loser),
        FixtureOutcome::AwayWin => (new_loser, new_winner),
        FixtureOutcome::Draw => unreachable!("draw handled above"),
    }
}

/// Wrap a state with its rounded conservative display value.
fn rating(model: &dyn RatingModel, state: &SkillState) -> ClubRating {
    ClubRating {
        elo: model.conservative_rating(state).round() as i64,
        state: state.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::skill::{self, wenglin};

    fn default_state() -> SkillState {
        skill::model_for(wenglin::VERSION).default_state()
    }

    #[test]
    fn outcome_from_tallies() {
        assert_eq!(outcome(3, 1), FixtureOutcome::HomeWin);
        assert_eq!(outcome(1, 3), FixtureOutcome::AwayWin);
        assert_eq!(outcome(2, 2), FixtureOutcome::Draw);
    }

    /// Oracle: two default clubs, home wins by the normal margin (6) under
    /// Weng-Lin BradleyTerryFull — winner mu ~27.6354, loser mu ~22.3646, both
    /// sigma ~8.0658 (the same reference vector as the 1v1 player update).
    #[test]
    fn home_win_moves_both_clubs_deterministically() {
        let model = skill::model_for(wenglin::VERSION);
        let (home, away) = update_clubs(
            model.as_ref(),
            &default_state(),
            &default_state(),
            FixtureOutcome::HomeWin,
            6.0,
        );
        assert!(
            (home.state.mu - 27.6354).abs() < 0.01,
            "home mu {}",
            home.state.mu
        );
        assert!(
            (away.state.mu - 22.3646).abs() < 0.01,
            "away mu {}",
            away.state.mu
        );
        assert!((home.state.sigma - 8.0658).abs() < 0.01);
        assert!((away.state.sigma - 8.0658).abs() < 0.01);
        assert_eq!(home.state.games_played, 1);
        assert_eq!(away.state.games_played, 1);
        // Display = round(mu - 3*sigma).
        assert_eq!(home.elo, (27.6354 - 3.0 * 8.0658f64).round() as i64);
        assert_eq!(away.elo, (22.3646 - 3.0 * 8.0658f64).round() as i64);
    }

    /// Away win is the mirror image: the away club gets the winner's mu.
    #[test]
    fn away_win_is_mirror_of_home_win() {
        let model = skill::model_for(wenglin::VERSION);
        let (home, away) = update_clubs(
            model.as_ref(),
            &default_state(),
            &default_state(),
            FixtureOutcome::AwayWin,
            6.0,
        );
        assert!(
            (away.state.mu - 27.6354).abs() < 0.01,
            "away mu {}",
            away.state.mu
        );
        assert!(
            (home.state.mu - 22.3646).abs() < 0.01,
            "home mu {}",
            home.state.mu
        );
    }

    #[test]
    fn draw_leaves_states_unchanged() {
        let model = skill::model_for(wenglin::VERSION);
        let before = default_state();
        let (home, away) =
            update_clubs(model.as_ref(), &before, &before, FixtureOutcome::Draw, 0.0);
        assert_eq!(home.state, before);
        assert_eq!(away.state, before);
        assert_eq!(home.state.games_played, 0);
    }
}
