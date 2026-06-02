import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { ApiRequestError, gamesApi } from "../api";
import { Alert, Spinner, Text } from "../components/atoms";
import type { CompleteGame, MemberEvent } from "../types";

/**
 * Lists the signed-in user's completed games via `gamesApi.userGames`.
 *
 * Intended route: `/games` (auth-guarded).
 */
export function PastGamesPage(): ReactElement {
  const [games, setGames] = useState<CompleteGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void gamesApi
      .userGames()
      .then((rows) => {
        if (!cancelled) setGames(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : "Could not load your games.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const teamNames = (members: MemberEvent[]): string =>
    members.map((m) => m.username).join(", ") || "—";

  return (
    <Stack spacing={3}>
      <Text variant="h1">Past games</Text>
      {loading ? (
        <Spinner />
      ) : error !== null ? (
        <Alert severity="error">{error}</Alert>
      ) : games.length === 0 ? (
        <Text>You have not completed any games yet.</Text>
      ) : (
        <TableContainer>
          <Table aria-label="Completed games">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Team 1</TableCell>
                <TableCell>Team 2</TableCell>
                <TableCell>Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell>{game.start_time}</TableCell>
                  <TableCell>{teamNames(game.team1)}</TableCell>
                  <TableCell>{teamNames(game.team2)}</TableCell>
                  <TableCell>{game.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
