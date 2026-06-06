import { vi } from "vitest";

import { fireEvent, render, screen, within } from "../../test/renderWithTheme.tsx";
import type { EventDetail, Game, Member, MemberEvent } from "../../types";

import { MatchmakingPanel, compareMembers } from "./MatchmakingPanel.tsx";

const member = (id: string, first: string): Member => ({
  id,
  first_name: first,
  surname: "X",
  username: first.toLowerCase(),
  is_club_admin: false,
});

const em = (id: string, first: string, elo: number | null): MemberEvent => ({
  id,
  first_name: first,
  surname: "X",
  username: first.toLowerCase(),
  elo,
});

const event: EventDetail = {
  id: "1",
  game_type: { name: "badminton doubles" },
  date: "2026-07-01",
  start_time: "18:00",
  finish_time: "20:00",
  number_of_courts: 4,
  sbmm: true,
  guests_allowed: false,
  over_18_under_18_mixed: "all ages",
  active_members: [member("1", "Ada")],
  in_game_members: [],
  event_active: true,
  event_complete: false,
  mode: "sbmm",
  even_teams: true,
  team_size: 2,
};

const games: Game[] = [
  {
    id: "3",
    team1: [{ id: "1", first_name: "Ada", surname: "L", username: "ada", elo: 1200 }],
    team2: [{ id: "2", first_name: "Al", surname: "T", username: "al", elo: 1250 }],
  },
];

function renderPanel(
  isAdmin: boolean,
  members: MemberEvent[] = [em("1", "Ada", 1200), em("2", "Al", 1400)],
  detail: EventDetail = event,
): {
  onCreateGame: ReturnType<typeof vi.fn>;
  onDeactivateMember: ReturnType<typeof vi.fn>;
  onChangeSelectionMode: ReturnType<typeof vi.fn>;
} {
  const onCreateGame = vi.fn();
  const onDeactivateMember = vi.fn();
  const onChangeSelectionMode = vi.fn();
  render(
    <MatchmakingPanel
      event={detail}
      games={games}
      isAdmin={isAdmin}
      members={members}
      onCreateGame={onCreateGame}
      onCompleteEvent={vi.fn()}
      onChangeSelectionMode={onChangeSelectionMode}
      onSubmitScore={vi.fn()}
      onDeleteGame={vi.fn()}
      onPausePlayer={vi.fn()}
      onActivateMember={vi.fn()}
      onDeactivateMember={onDeactivateMember}
      onCreateDummyUser={vi.fn<(draft: unknown) => Promise<void>>().mockResolvedValue()}
      onInviteMember={vi.fn<(userId: string) => Promise<void>>().mockResolvedValue()}
      onSearchUsers={vi.fn().mockResolvedValue({ results: [], page: 1, has_next: false })}
    />,
  );
  return { onCreateGame, onDeactivateMember, onChangeSelectionMode };
}

/** Names of the members in a panel list, in render order. */
function panelOrder(listName: string): (string | null)[] {
  const list = screen.getByRole("list", { name: listName });
  return within(list)
    .getAllByRole("listitem")
    .map((li) => li.textContent);
}

describe("MatchmakingPanel organism", () => {
  it("renders in-progress games", () => {
    renderPanel(true);
    expect(screen.getByLabelText("Game 3")).toBeInTheDocument();
  });

  it("shows admin controls and fires create/deactivate callbacks", () => {
    const { onCreateGame, onDeactivateMember } = renderPanel(true);
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    expect(onCreateGame).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /deactivate ada/i }));
    expect(onDeactivateMember).toHaveBeenCalledWith("1");
  });

  it("shows the game type as a disabled control and persists mode changes", () => {
    const { onChangeSelectionMode } = renderPanel(true);

    const gameType = screen.getByRole("combobox", { name: "Game type" });
    expect(gameType).toHaveAttribute("aria-disabled", "true");

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Selection mode" }));
    fireEvent.click(screen.getByRole("option", { name: "Social" }));
    expect(onChangeSelectionMode).toHaveBeenCalledWith("social");
  });

  it("warns when there are too few active players", () => {
    renderPanel(true);
    expect(screen.getByText(/few available players/i)).toBeInTheDocument();
  });

  it("opens the Add user modal for admins", () => {
    renderPanel(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add user/i }));
    expect(screen.getByRole("dialog", { name: "Add user" })).toBeInTheDocument();
  });

  it("hides admin controls for non-admins", () => {
    renderPanel(false);
    expect(screen.queryByRole("button", { name: "Create game" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Active members" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add user/i })).not.toBeInTheDocument();
  });

  it("shows each member's ELO and an Unranked chip when missing", () => {
    renderPanel(true, [em("1", "Ada", 1200), em("2", "Al", 1400), em("3", "Bo", null)]);
    expect(screen.getByText("1200")).toBeInTheDocument();
    expect(screen.getByText("1400")).toBeInTheDocument();
    expect(screen.getByText("Unranked")).toBeInTheDocument();
  });

  it("defaults to ELO descending with unranked members last", () => {
    const detail: EventDetail = { ...event, active_members: [] };
    renderPanel(true, [em("1", "Al", 1400), em("2", "Bo", null), em("3", "Cy", 1100)], detail);
    const order = panelOrder("Inactive members");
    expect(order[0]).toContain("Al X");
    expect(order[1]).toContain("Cy X");
    expect(order[2]).toContain("Bo X");
  });

  it("re-sorts a panel by name when chosen", () => {
    const detail: EventDetail = { ...event, active_members: [] };
    renderPanel(true, [em("1", "Al", 1100), em("2", "Cy", 1400), em("3", "Bo", null)], detail);
    // The inactive panel is the only one with members; pick its sort dropdown.
    const sortSelects = screen.getAllByRole("combobox", { name: "Sort by" });
    const inactiveSort = sortSelects[sortSelects.length - 1];
    fireEvent.mouseDown(inactiveSort);
    fireEvent.click(screen.getByRole("option", { name: "Name" }));
    // Direction stays descending, so names sort Cy, Bo, Al.
    const order = panelOrder("Inactive members");
    expect(order[0]).toContain("Cy X");
    expect(order[2]).toContain("Al X");
  });
});

describe("compareMembers", () => {
  it("orders by ELO with the requested direction", () => {
    const a = em("1", "A", 1200);
    const b = em("2", "B", 1400);
    expect(compareMembers(a, b, "elo", "desc")).toBeGreaterThan(0);
    expect(compareMembers(a, b, "elo", "asc")).toBeLessThan(0);
  });

  it("always sorts unranked members last regardless of direction", () => {
    const ranked = em("1", "A", 1200);
    const unranked = em("2", "B", null);
    expect(compareMembers(ranked, unranked, "elo", "asc")).toBeLessThan(0);
    expect(compareMembers(ranked, unranked, "elo", "desc")).toBeLessThan(0);
    expect(compareMembers(unranked, ranked, "elo", "asc")).toBeGreaterThan(0);
    expect(compareMembers(unranked, ranked, "elo", "desc")).toBeGreaterThan(0);
  });

  it("orders by name using locale compare", () => {
    const ada = em("1", "Ada", 1000);
    const bo = em("2", "Bo", 2000);
    expect(compareMembers(ada, bo, "name", "asc")).toBeLessThan(0);
    expect(compareMembers(ada, bo, "name", "desc")).toBeGreaterThan(0);
  });
});
