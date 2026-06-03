import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import { render, screen, waitFor } from "../test/renderWithTheme.tsx";
import type { Club, Member, MemberRequest, Social } from "../types";

import { ClubDetailPage } from "./ClubDetailPage.tsx";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

const clubDetail = vi.fn<() => Promise<Club>>();
const clubSocials = vi.fn<() => Promise<Social[]>>();
const clubMembers = vi.fn<() => Promise<Member[]>>();
const clubRequests = vi.fn<() => Promise<MemberRequest[]>>();
vi.mock("../api", () => ({
  ApiRequestError: class extends Error {},
  clubsApi: {
    clubDetail: () => clubDetail(),
    clubSocials: () => clubSocials(),
    clubMembers: () => clubMembers(),
    clubRequests: () => clubRequests(),
  },
}));

vi.mock("../hooks", () => ({ useAuth: () => ({ user: { id: 1, username: "ada" } }) }));

vi.mock("../components/organisms", () => ({
  MapView: () => <div data-testid="map" />,
  MemberTable: ({ members }: { members: Member[] }) => (
    <div data-testid="member-table">{members.length} members</div>
  ),
  ClubRequests: ({ requests }: { requests: MemberRequest[] }) => (
    <div data-testid="requests">{requests.length} requests</div>
  ),
}));

vi.mock("../components/molecules", () => ({
  AddressForm: () => <div data-testid="address-form" />,
  LogoUploader: () => <div data-testid="logo-uploader" />,
  SocialLink: ({ social }: { social: Social }) => <span>{social.platform}</span>,
}));

const adminClub: Club = {
  id: 5,
  club_username: "smashers",
  name: "Smashers",
  sport_type: { name: "tennis" },
  president: "ada",
  info: "Best club",
  date_created: "2026-01-01",
  logo: "",
  address: "",
  coordinates: { lat: 51, lng: 0 },
  is_club_admin: true,
  is_club_president: true,
  membership_status: 2,
  is_active: true,
  is_event_upcoming: false,
  average_attendance: "New!",
  member_requests: 1,
};

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={["/club/5"]}>
      <Routes>
        <Route path="/club/:clubId" element={<ClubDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ClubDetailPage", () => {
  it("renders the club header and admin sections for an admin", async () => {
    clubDetail.mockResolvedValue(adminClub);
    clubSocials.mockResolvedValue([{ platform: "facebook", url: "https://fb.com/x" }]);
    clubMembers.mockResolvedValue([
      { id: 1, first_name: "Ada", surname: "Lovelace", username: "ada", is_club_admin: true },
    ]);
    clubRequests.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Smashers" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("member-table")).toHaveTextContent("1 members");
    });
    expect(screen.getByTestId("requests")).toBeInTheDocument();
    expect(screen.getByTestId("address-form")).toBeInTheDocument();
    expect(screen.getByText("facebook")).toBeInTheDocument();
  });

  it("renders without crashing when the club has no sport set", async () => {
    clubDetail.mockResolvedValue({ ...adminClub, sport_type: null });
    clubSocials.mockResolvedValue([]);
    clubMembers.mockResolvedValue([]);
    clubRequests.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Smashers" })).toBeInTheDocument();
    expect(screen.getByText(/No sport · @smashers/)).toBeInTheDocument();
  });

  it("hides admin sections for a non-admin and offers a join action", async () => {
    clubDetail.mockResolvedValue({
      ...adminClub,
      is_club_admin: false,
      is_club_president: false,
      membership_status: 0,
    });
    clubSocials.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Smashers" })).toBeInTheDocument();
    expect(screen.queryByTestId("member-table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request to join/i })).toBeInTheDocument();
  });
});
