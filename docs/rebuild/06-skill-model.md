# Skill Model: Flexible, Long-Term Rating + Allocation Design

A design for a **growable** skill system: one pluggable rating engine that
serves both matchmaking (game allocation) and the rankings, chosen so we avoid
algorithm lock-in as we scale across sports, modes, and team sizes.

> Status: **implemented**. The `RatingModel` trait and its three models
> (`EloModel`, `WengLinModel`, `Glicko2Model`) live in `server/src/skill/`;
> `even_teams` balances by enumeration, and `domain::games` persists `mu/sigma`
> per `(user, game_type)` (migration `0008_skill_model.sql`). The limits below
> were the motivation and are now resolved — see [Resolution](#resolution).

## Why now

The ported heuristics had hard limits that blocked growth:

- **The team balancer does not balance.** `even_teams`
  (`matchmaking.rs:89-148`) is a degenerate simulated annealing — its accept
  test is always true (a faithfully-ported Django bug, noted at `:86-88`) and it
  keeps the *last* swap rather than the *best*, so it returns a near-random
  split. The temperature/energy machinery is dead computation.
- **No notion of uncertainty.** Fixed K=40, everyone starts at 1000, no
  provisional period, no decay, no rating deviation (`rating.rs`). A 1-game and
  a 1000-game player are treated identically.
- **Flat team credit.** Every teammate receives the same delta off the
  team-average elo (`rating.rs` `apply_elo_update`), so carrying a weak partner
  is systematically mis-rated.
- **Margin-of-victory is fused into the outcome term** via a coarse 6-bucket
  step `g()` (`rating.rs:25-39`) — uncalibrated, and a win by exactly 1 point
  produces a *negative* rating change against an equal opponent.
- **Lock-in.** Rating math, persistence, and matchmaking are entangled, so
  changing the algorithm means edits across `rating.rs`, `matchmaking.rs`,
  `domain/games.rs`, and the schema.

The rating loop is also closed **only for SBMM games** (with `sbmm=false` elo is
frozen, only winstreaks move), and ratings are stored per `(user, game_type)`
(`migrations/0003_games_elo.sql`).

## Resolution

Each limit above is now fixed behind the [`RatingModel`](06b-architecture.md)
seam:

- **Balancer** — `even_teams` (`matchmaking.rs`) enumerates every split and
  picks the most even by `expected_score`; deterministic and optimal.
- **Uncertainty** — `SkillState` carries `sigma` + `games_played`;
  cold-start and σ-decay (lazy, from `last_game`) fall out per model.
- **Team credit** — `WengLinModel` weights each player's update by their own
  variance (no more flat team-average delta).
- **Margin of victory** — `rating::g` is now zero-sum (`g(d)+g(-d)=1`) and a
  win by one point is always a gain; MOV is a model `margin` weight.
- **Lock-in** — model is selected per game type via `game_types.model_version`;
  legacy types stay `elo_mov_v1` (1000-scale preserved), new types default to
  Weng-Lin. Per-game calibration (predicted vs actual) is logged for A/B.

## Goals

- **No lock-in:** the skill algorithm is a swappable component; choose between
  models on measured calibration, not faith.
- **Grows with us:** one model handles 1v1 through N-player teams across every
  sport/mode.
- **Confidence-aware:** carries uncertainty so cold-start, decay, and
  informative matchmaking fall out naturally.
- **Auditable & safe to roll out:** versioned per game type; existing ratings
  survive; pure logic stays oracle-testable (`.claude/rules/testing.md`).

## Read next

- **[Model comparison](06a-model-comparison.md)** — Elo vs Glicko-2 vs
  Weng-Lin/OpenSkill, benefits and tradeoffs, and the recommendation.
- **[Architecture](06b-architecture.md)** — the `RatingModel` trait, a
  model-agnostic data model + migration, matchmaking integration, versioned
  rollout, and the test/calibration strategy.
