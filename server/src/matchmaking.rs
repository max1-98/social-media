//! Pure matchmaking / team-balancing. Ports `backend/games/game_creation.py`:
//! `player_elo` (winstreak bonuses), `even_teams` (simulated annealing),
//! `mixed_sbmm`, `sbmm`, `social_count` (cubic), `social`. No I/O —
//! unit-tested against the Python outputs on identical inputs.
