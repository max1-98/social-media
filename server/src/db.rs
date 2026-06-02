//! Database pool construction and migrations.
//!
//! One `SqlitePool` is shared via `AppState`. Migrations live in `migrations/`
//! and are embedded into the binary, so a fresh deploy self-initialises.

use std::str::FromStr;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;

/// Open (creating if needed) the SQLite database and run all migrations.
pub async fn init_pool(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true)
        // Enforce FK constraints (off by default in SQLite) so ON DELETE rules
        // and erasure-by-anonymization behave as the schema declares.
        .foreign_keys(true)
        .busy_timeout(std::time::Duration::from_secs(5));

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    migrate(&pool).await?;
    Ok(pool)
}

/// Run the embedded migrations. Also used by tests against an in-memory pool.
pub async fn migrate(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}

#[cfg(test)]
pub mod test_support {
    use super::*;

    /// A fresh, fully-migrated in-memory database for a single test.
    pub async fn test_pool() -> SqlitePool {
        let options = SqliteConnectOptions::from_str("sqlite::memory:")
            .expect("valid sqlite url")
            .foreign_keys(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .expect("connect in-memory sqlite");
        migrate(&pool).await.expect("run migrations");
        pool
    }
}

#[cfg(test)]
mod tests {
    use super::test_support::test_pool;

    #[tokio::test]
    async fn migrations_apply_and_seed() {
        let pool = test_pool().await;

        // Core + auth + GDPR tables exist.
        for table in [
            "users",
            "clubs",
            "members",
            "games",
            "elo",
            "events",
            "posts",
            "email_verify",
            "password_reset",
            "tokens",
            "consent_log",
        ] {
            let count: i64 = sqlx::query_scalar(&format!(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='{table}'"
            ))
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(count, 1, "table {table} should exist");
        }

        // Seed data is present (5 sports, 8 game types from the legacy fixtures).
        let sports: i64 = sqlx::query_scalar("SELECT count(*) FROM sports")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(sports, 5);
        let game_types: i64 = sqlx::query_scalar("SELECT count(*) FROM game_types")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(game_types, 8);
    }
}
