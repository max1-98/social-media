# Skill Model: Comparison & Recommendation

We compare three rating models against our needs: **team games of any size**,
**many sports/modes**, **margin-of-victory** signal, **cold-start**, **decay**,
and **no lock-in** as we scale. See [the overview](06-skill-model.md) and
[architecture](06b-architecture.md).

## The candidates

### Elo + margin-of-victory (what we have today)

- **Benefits:** trivial to implement and explain; strictly zero-sum for
  equal-size teams; cheap.
- **Limits:** a single scalar with no uncertainty → no principled cold-start,
  decay, or confidence; K and the MOV curve are hand-tuned; teams handled by
  averaging with flat per-player credit; the current MOV step has a win-by-1
  negative quirk (`rating.rs:25-39`).
- **Verdict:** keep as a baseline implementation for parity and A/B reference.

### Glicko-2

- **Benefits:** adds **rating deviation (RD)** and **volatility** on top of a
  rating → real cold-start (high RD), inactivity decay (RD grows over time),
  and confidence intervals; well-documented and battle-tested; simple storage
  (three floats).
- **Limits:** natively a **1v1** model; team play needs an averaging/extension
  layer; designed around **rating periods** (batch updates), which fits an
  event-based product but is less natural for instant per-game updates.
- **Verdict:** an excellent fit for 1v1-heavy sports (singles), and a strong
  second implementation that proves the abstraction.

### Weng-Lin / OpenSkill (Bayesian, TrueSkill-family)

- **Benefits:** **natively multiplayer and team-size-agnostic** — one model for
  singles, doubles, and larger sides; each player carries **skill (μ) +
  uncertainty (σ)**; gives **correct individual credit** on teams (beats flat
  averaging); the same uncertainty directly powers **balanced *and* informative**
  matchmaking (pair players to drive σ down). Online (per-game) updates.
- **Limits:** more math than Elo; several rank-update models to choose from
  (Bradley-Terry / Thurstone variants). Note: **TrueSkill itself is patented by
  Microsoft** — so we target the **open Weng-Lin formulation (OpenSkill-style)**
  to stay license-clean.
- **Verdict:** best long-term fit for a **team-based SBMM** product that grows
  across sports and team sizes.

## Side-by-side

| Need | Elo+MOV | Glicko-2 | Weng-Lin/OpenSkill |
|---|---|---|---|
| Uncertainty / confidence | ✗ | ✓ (RD) | ✓ (σ) |
| Cold-start handling | ✗ | ✓ | ✓ |
| Inactivity decay | ✗ | ✓ | ✓ (inflate σ) |
| Native team / N-player | ✗ (avg) | ✗ (avg) | ✓ |
| Per-player team credit | flat | flat | ✓ |
| Powers matchmaking quality | weak | ok | ✓ |
| Margin-of-victory | built-in (coarse) | add-on | add-on (weight) |
| Storage | 1 float | 3 floats | 2 floats (+extras) |
| License/IP risk | none | none | none (avoid TrueSkill™) |
| Implementation cost | — | low | medium |

## Recommendation

**Do not pick a single permanent algorithm — pick an interface.** Define one
`RatingModel` trait (see [architecture](06b-architecture.md)) and ship three
implementations behind it:

1. **Weng-Lin/OpenSkill** — the default target; carries μ/σ, handles any team
   size, and gives matchmaking real uncertainty to exploit.
2. **Glicko-2** — for 1v1-dominant sports and as a no-lock-in alternative.
3. **Elo+MOV** — the existing math, retained for parity and A/B baselines.

Selection is per `game_type` via a `model_version`, and we choose between live
models using **calibration telemetry** (Brier score / reliability), so the
decision is data-driven and reversible. That is the concrete "no lock-in".
