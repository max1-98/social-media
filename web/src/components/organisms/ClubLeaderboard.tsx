import type { ReactElement } from "react";

import type { ClubLadderEntry } from "../../types";
import { Text } from "../atoms";

import { DataGrid } from "./DataGrid";
import type { DataGridColumn } from "./DataGrid";

export interface ClubLeaderboardProps {
  /** The club ELO ladder rows, highest ELO first (as ordered by the backend). */
  entries: ClubLadderEntry[];
  /** Show a spinner instead of the grid. */
  loading?: boolean;
  /** Show an error alert instead of the grid. */
  error?: string | null;
}

/** A ladder row with its 1-based position in the incoming (backend) order. */
interface RankedEntry extends ClubLadderEntry {
  rank: number;
}

const COLUMNS: DataGridColumn<RankedEntry>[] = [
  {
    key: "rank",
    header: "#",
    render: (row) => row.rank,
    width: 56,
    align: "right",
  },
  {
    key: "name",
    header: "Club",
    render: (row) => (
      <Text variant="body2">
        {row.name}{" "}
        <Text component="span" variant="caption" color="text.secondary">
          @{row.club_username}
        </Text>
      </Text>
    ),
    sortable: true,
    sortValue: (row) => row.name,
  },
  {
    key: "elo",
    header: "ELO",
    render: (row) => row.elo,
    sortable: true,
    sortValue: (row) => row.elo,
    width: 96,
    align: "right",
  },
  {
    key: "games_played",
    header: "Games",
    render: (row) => row.games_played,
    sortable: true,
    sortValue: (row) => row.games_played,
    width: 96,
    align: "right",
  },
  {
    key: "member_strength",
    header: "Member strength",
    render: (row) => row.member_strength ?? "—",
    sortable: true,
    sortValue: (row) => row.member_strength ?? -1,
    width: 160,
    align: "right",
  },
];

/**
 * Organism: the club ELO ladder. Renders {@link ClubLadderEntry} rows in the
 * reusable {@link DataGrid} (rank, club, ELO, games, member strength). The rank
 * column reflects the incoming order; clicking a sortable header re-sorts but is
 * a view convenience and does not renumber the rank. Pure presentation — the
 * page fetches via `fixturesApi.clubLeaderboard`.
 */
export function ClubLeaderboard({
  entries,
  loading = false,
  error = null,
}: ClubLeaderboardProps): ReactElement {
  const ranked: RankedEntry[] = entries.map((entry, index) => ({ ...entry, rank: index + 1 }));

  return (
    <DataGrid
      rows={ranked}
      columns={COLUMNS}
      getRowId={(row) => row.id}
      ariaLabel="Club ELO ladder"
      loading={loading}
      error={error}
      emptyMessage="No clubs on the ladder yet."
    />
  );
}
