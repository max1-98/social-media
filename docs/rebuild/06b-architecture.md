# Skill Model: Architecture & Rollout

How we make the skill algorithm swappable so we can grow without rewrites. See
[overview](06-skill-model.md) and [comparison](06a-model-comparison.md).

## The seam: one `RatingModel` trait

Keep the math pure and IO-free (as `rating.rs` is today), but behind a trait so
allocation and storage never depend on a specific algorithm. Sketch:

```rust
/// Model-agnostic per-(user, game_type) skill state.
pub struct SkillState {
    pub mu: f64,            // skill estimate (Elo uses this as the rating)
    pub sigma: f64,         // uncertainty (Elo: a constant placeholder)
    pub games_played: u32,
    pub extra: serde_json::Value, // model-specific fields (e.g. Glicko volatility)
}

pub struct TeamSkills(pub Vec<SkillState>);

pub trait RatingModel {
    fn default_state(&self) -> SkillState;
    /// Win probability of team A over B — the ONLY thing matchmaking needs.
    fn expected_score(&self, a: &TeamSkills, b: &TeamSkills) -> f64;
    /// Post-game update for any number of teams, ranked best-first, with an
    /// optional margin-of-victory weight. Returns new states in input order.
    fn update(&self, teams: &[TeamSkills], ranks: &[u32], margin: f64)
        -> Vec<Vec<SkillState>>;
    /// Display/ladder value (e.g. mu - 3*sigma) — conservative skill.
    fn conservative_rating(&self, s: &SkillState) -> f64;
}
```

- **Matchmaking depends only on `expected_score` + `sigma`.** `even_teams`
  becomes: minimize `|expected_score(a, b) - 0.5|` (optionally weighted by
  uncertainty), replacing the degenerate annealing. For the real team sizes here
  (2v2 → 3 partitions, 3v3 → 10), enumerate **all** partitions and pick the best
  — deterministic, optimal, cheap, and trivially testable.
- **Each model is one impl:** `EloModel`, `Glicko2Model`, `WengLinModel`.
- Lives in a new pure module (e.g. `server/src/skill/`), with `rating.rs` math
  folded in as `EloModel`.

## Model-agnostic persistence

Today `elo` stores a single `elo` integer (`migrations/0003_games_elo.sql`). Add
columns so any model fits, with a migration that **backfills existing rows** so
nothing is lost:

| Column | Purpose | Backfill for existing rows |
|---|---|---|
| `mu` REAL | skill estimate | = current `elo` |
| `sigma` REAL | uncertainty | model default (e.g. 350/3 ≈ high) |
| `games_played` INT | for cold-start / decay | from `elo_game_wins`+`_loses` count |
| `model_version` TEXT | which model produced it | `'elo_mov_v1'` |
| `extra` TEXT (JSON) | model-specific fields | `'{}'` |

Keep `elo` as a generated/derived display column or keep writing it from
`conservative_rating` during transition. New columns are nullable / defaulted so
the migration is safe (see the `new-migration` skill + `.claude/rules/gdpr.md`
for the tombstone/erasure interaction — skill rows stay pseudonymous).

## Matchmaking integration

`domain/games.rs` `load_active_members` already loads per-game-type state; it
returns `SkillState` instead of `(elo, winstreak)`. The `create_sbmm` /
`create_social` / `mixed_sbmm` flows are unchanged in shape — they call
`expected_score` for balancing and the chosen `RatingModel::update` on
completion. Winstreak bonuses (`player_elo`) become a model-independent
matchmaking-only adjustment, or are dropped in favour of σ-driven matching.

## Rollout & no-lock-in

1. Land the trait + `EloModel` as a pure refactor — **no behaviour change**,
   oracle tests still pass against the legacy outputs.
2. Add the persistence migration + backfill; start writing `mu/sigma`.
3. Swap the balancer to enumerate-and-minimise on `expected_score`.
4. Add `WengLinModel` (+ `Glicko2Model`); select per `game_type` via
   `model_version`. New game types can adopt a new model without disturbing old
   ratings (auditability preserved).
5. **Calibration telemetry:** on each completed game, log predicted
   `expected_score` vs actual outcome; track Brier score / reliability per
   model. Choose and switch models on this data — the concrete mechanism for
   staying un-locked-in.
6. **Decay** via lazy expiry (per the project rule): inflate `sigma` based on
   `now - last_game` at read time — implemented once in each model, no scheduler.

## Test strategy

- **Oracle:** `EloModel` must reproduce the existing `rating.rs` unit results
  exactly (parity preserved through the refactor).
- **Property/invariant tests** for the balancer: all players placed once, teams
  correct size, `expected_score` nearest 0.5 among all partitions.
- **Reference-vector tests** for `Glicko2Model` (published Glickman worked
  example) and `WengLinModel` (OpenSkill reference outputs).
- **Calibration test** on seeded histories: Brier score improves vs the Elo
  baseline. CI runs `cargo test` (see `.claude/rules/testing.md`).
