# Skill Model: Flexible, Long-Term Rating + Allocation Design

A design for a **growable** skill system: one pluggable rating engine that
serves both matchmaking (game allocation) and the rankings, chosen so we avoid
algorithm lock-in as we scale across sports, modes, and team sizes.

> Status: design only (no code yet). The current `server/src/matchmaking.rs` and
> `server/src/rating.rs` are faithful parity ports of the legacy Django logic;
> this doc defines the post-parity target. We are free to diverge.

## Why now

The ported heuristics have hard limits that block growth:

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
