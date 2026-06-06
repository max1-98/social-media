//! ELO: rating rows and win/lose join tables. Pure rating math lives in
//! `crate::rating` and is unit-tested against the existing Django outputs.
//!
//! Ports: `backend/elo/` (models, services, views). The one route mirrors
//! `EloListView` + `EloSerializer`.

use axum::extract::{Path, State};
use axum::Json;
use serde::Serialize;
use serde_json::{json, Value};

use crate::domain::auth::AuthUser;
use crate::error::AppError;
use crate::state::AppState;

/// One rating row, shaped exactly like the Django `EloSerializer`.
#[derive(Debug, Serialize)]
pub struct EloEntry {
    pub game_type: String,
    pub elo: i64,
    pub winstreak: i64,
    pub last_game: String,
    pub best_winstreak: i64,
    /// Win/lose ratio truncated to two decimals (Django `get_winrate`); `0` or
    /// `1` integer in the degenerate no-losses cases — hence a raw JSON number.
    pub winrate: Value,
    pub total_games: i64,
    pub sport: String,
    pub style: String,
    pub wins: i64,
}

/// Mirror of `EloSerializer.get_winrate`: `int(wins/loses*100)/100` when there are
/// losses, else `0` (some wins) or `1` (no games).
fn winrate(wins: i64, loses: i64) -> Value {
    if loses != 0 {
        let truncated = ((wins as f64 / loses as f64) * 100.0) as i64;
        json!(truncated as f64 / 100.0)
    } else if wins != 0 {
        json!(0)
    } else {
        json!(1)
    }
}

/// Mirror of `EloSerializer.get_style`: the game-type name after its first space
/// (e.g. `"badminton singles"` -> `"singles"`).
fn style(game_type_name: &str) -> String {
    game_type_name
        .split_once(' ')
        .map(|(_, rest)| rest.to_string())
        .unwrap_or_else(|| game_type_name.to_string())
}

/// GET /api/elo/elos/<username>/ — a user's rating rows. Mirrors `EloListView`
/// (auth required; 404 if the username doesn't exist).
pub async fn list_for_user(
    State(app): State<AppState>,
    _user: AuthUser,
    Path(username): Path<String>,
) -> Result<Json<Vec<EloEntry>>, AppError> {
    let normalized = username.trim().to_lowercase();
    let user = sqlx::query!("SELECT id FROM users WHERE username = ?", normalized)
        .fetch_optional(&app.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("No CustomUser matches the given query.".into()))?;

    let rows = sqlx::query!(
        r#"
        SELECT e.elo            AS "elo!: i64",
               e.winstreak      AS "winstreak!: i64",
               e.last_game      AS "last_game!: String",
               e.best_winstreak AS "best_winstreak!: i64",
               gt.name          AS "game_type_name?: String",
               s.name           AS "sport_name?: String",
               (SELECT COUNT(*) FROM elo_game_wins w WHERE w.elo_id = e.id)  AS "wins!: i64",
               (SELECT COUNT(*) FROM elo_game_loses l WHERE l.elo_id = e.id) AS "loses!: i64"
        FROM user_elos ue
        JOIN elo e ON e.id = ue.elo_id
        LEFT JOIN game_types gt ON gt.id = e.game_type_id
        LEFT JOIN sports s ON s.id = gt.sport_id
        WHERE ue.user_id = ? AND e.scope = 'internal'
        ORDER BY e.id
        "#,
        user.id
    )
    .fetch_all(&app.pool)
    .await?;

    let entries = rows
        .into_iter()
        .map(|r| {
            let game_type = r.game_type_name.unwrap_or_default();
            EloEntry {
                style: style(&game_type),
                game_type,
                elo: r.elo,
                winstreak: r.winstreak,
                last_game: r.last_game,
                best_winstreak: r.best_winstreak,
                winrate: winrate(r.wins, r.loses),
                total_games: r.wins + r.loses,
                sport: r.sport_name.unwrap_or_default(),
                wins: r.wins,
            }
        })
        .collect();

    Ok(Json(entries))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn winrate_matches_django_formula() {
        // 3 wins / 2 losses -> int(150)/100 = 1.5
        assert_eq!(winrate(3, 2), json!(1.5));
        // 1 win / 3 losses -> int(33.33)/100 = 0.33
        assert_eq!(winrate(1, 3), json!(0.33));
        // some wins, no losses -> 0
        assert_eq!(winrate(5, 0), json!(0));
        // no games at all -> 1
        assert_eq!(winrate(0, 0), json!(1));
    }

    #[test]
    fn style_strips_leading_word() {
        assert_eq!(style("badminton singles"), "singles");
        assert_eq!(style("tennis doubles"), "doubles");
        assert_eq!(style("snooker singles"), "singles");
    }
}
