//! Pure ELO rating math. Ports `backend/elo/services.py`:
//! `prob_win` (b = 1/300), `g`, `result`, `team1Win`, `scoreDifference`,
//! `update_elo` (k = 40). No I/O — unit-tested against the Python outputs on
//! identical inputs (the existing Django tests act as the oracle).
