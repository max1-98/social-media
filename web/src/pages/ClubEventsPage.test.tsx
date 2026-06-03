import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import { render, screen, waitFor } from "../test/renderWithTheme.tsx";
import type { Club, Event } from "../types";

import { ClubEventsPage } from "./ClubEventsPage.tsx";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

const clubEvents = vi.fn<() => Promise<Event[]>>();
const clubDetail = vi.fn<() => Promise<Club>>();
vi.mock("../api", () => ({
  ApiRequestError: class extends Error {},
  eventsApi: { clubEvents: () => clubEvents() },
  clubsApi: { clubDetail: () => clubDetail() },
}));

vi.mock("../components/organisms", () => ({
  EventList: ({ events }: { events: Event[] }) => (
    <div data-testid="event-list">{events.length} events</div>
  ),
}));

function clubWithAdmin(isAdmin: boolean): Club {
  return {
    id: 7,
    club_username: "c",
    name: "Club",
    sport_type: null,
    president: "ada",
    info: "",
    date_created: "2026-01-01",
    logo: "",
    address: "",
    coordinates: null,
    is_club_admin: isAdmin,
    is_club_president: false,
    membership_status: 2,
    is_active: true,
    is_event_upcoming: false,
    average_attendance: 0,
    member_requests: 0,
  };
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={["/club/7/events"]}>
      <Routes>
        <Route path="/club/:clubId/events" element={<ClubEventsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ClubEventsPage", () => {
  it("shows the create button to club admins", async () => {
    clubEvents.mockResolvedValue([]);
    clubDetail.mockResolvedValue(clubWithAdmin(true));
    renderPage();
    expect(await screen.findByRole("button", { name: /create event/i })).toBeInTheDocument();
  });

  it("hides the create button from non-admins", async () => {
    clubEvents.mockResolvedValue([]);
    clubDetail.mockResolvedValue(clubWithAdmin(false));
    renderPage();
    await screen.findByTestId("event-list");
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /create event/i })).not.toBeInTheDocument();
    });
  });
});
