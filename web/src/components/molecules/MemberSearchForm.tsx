import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import type { SearchedUser, UserSearchPage } from "../../types";
import { Alert, Button, Input, Text } from "../atoms";

export interface MemberSearchFormProps {
  /**
   * Run a username search for a given 1-based page. The organism wires this to
   * `clubsApi.searchUsers`; the molecule stays free of the `api` layer.
   */
  onSearch: (q: string, page: number) => Promise<UserSearchPage>;
  /** Notifies the parent which user (if any) is currently selected for invite. */
  onSelectionChange: (user: SearchedUser | null) => void;
}

function userName(user: SearchedUser): string {
  return `${user.first_name ?? ""} ${user.surname ?? ""}`.trim() || user.username;
}

/**
 * Molecule: search platform users by username and pick one to invite. Owns the
 * query, the paginated results, and the current selection, surfacing the chosen
 * user to the parent via `onSelectionChange`. Composes atoms only.
 */
export function MemberSearchForm({
  onSearch,
  onSelectionChange,
}: MemberSearchFormProps): ReactElement {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(nextPage: number): Promise<void> {
    if (query.trim() === "") {
      setError("Enter a username to search.");
      return;
    }
    setLoading(true);
    setError(null);
    setSelectedId(null);
    onSelectionChange(null);
    try {
      const data = await onSearch(query.trim(), nextPage);
      setResults(data.results);
      setPage(data.page);
      setHasNext(data.has_next);
      setSearched(true);
    } catch {
      setError("We could not search members. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void runSearch(1);
  }

  function select(user: SearchedUser): void {
    setSelectedId(user.id);
    onSelectionChange(user);
  }

  return (
    <Stack spacing={2}>
      <form onSubmit={handleSubmit} aria-label="Search members">
        <Stack spacing={1} sx={{ flexDirection: "row", alignItems: "center" }}>
          <Input
            label="Username"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            fullWidth
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </Button>
        </Stack>
      </form>

      {error !== null ? <Alert severity="error">{error}</Alert> : null}

      {searched && results.length === 0 && error === null ? (
        <Text variant="body2">No members found.</Text>
      ) : null}

      {results.length > 0 ? (
        <List aria-label="Search results" dense>
          {results.map((user) => (
            <ListItemButton
              key={user.id}
              selected={user.id === selectedId}
              onClick={() => {
                select(user);
              }}
            >
              <ListItemText primary={userName(user)} secondary={`@${user.username}`} />
            </ListItemButton>
          ))}
        </List>
      ) : null}

      {searched && (page > 1 || hasNext) ? (
        <Stack spacing={1} sx={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            disabled={page <= 1 || loading}
            onClick={() => {
              void runSearch(page - 1);
            }}
          >
            Previous
          </Button>
          <Text variant="body2">Page {page}</Text>
          <Button
            variant="outlined"
            disabled={!hasNext || loading}
            onClick={() => {
              void runSearch(page + 1);
            }}
          >
            Next
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
