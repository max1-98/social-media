import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../test/renderWithTheme.tsx";
import type { EventDetail, MyClub, SeriesCreated } from "../types";

import { CreateEventPage } from "./CreateEventPage.tsx";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const myClubs = vi.fn<() => Promise<MyClub[]>>();
const createEvent = vi.fn<(pk: string, p: unknown) => Promise<EventDetail>>();
const createSeries = vi.fn<(pk: string, p: unknown) => Promise<SeriesCreated>>();
vi.mock("../api", () => ({
  ApiRequestError: class extends Error {},
  clubsApi: { myClubs: () => myClubs() },
  eventsApi: {
    createEvent: (pk: string, p: unknown) => createEvent(pk, p),
    createSeries: (pk: string, p: unknown) => createSeries(pk, p),
  },
}));

const ADMIN_CLUB: MyClub = {
  id: 3,
  name: "Admin Club",
  logo: "",
  sport_type: null,
  is_club_admin: true,
};
const MEMBER_CLUB: MyClub = {
  id: 4,
  name: "Member Club",
  logo: "",
  sport_type: null,
  is_club_admin: false,
};

function renderPicker(): void {
  render(
    <MemoryRouter initialEntries={["/event/create"]}>
      <Routes>
        <Route path="/event/create" element={<CreateEventPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CreateEventPage", () => {
  it("offers only clubs the user administers in the picker", async () => {
    myClubs.mockResolvedValue([ADMIN_CLUB, MEMBER_CLUB]);
    renderPicker();
    fireEvent.mouseDown(await screen.findByRole("combobox", { name: /club/i }));
    expect(await screen.findByRole("option", { name: "Admin Club" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Member Club" })).not.toBeInTheDocument();
  });

  it("posts a recurring series when a repeat cadence is chosen", async () => {
    myClubs.mockResolvedValue([ADMIN_CLUB]);
    createSeries.mockResolvedValue({ series_id: 1, events: [] });
    renderPicker();

    fireEvent.mouseDown(await screen.findByRole("combobox", { name: /club/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Admin Club" }));

    // Choosing a cadence reveals the "Repeat until" field.
    fireEvent.mouseDown(screen.getByRole("combobox", { name: /repeats/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Weekly" }));
    expect(screen.getByLabelText(/repeat until/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/first date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/repeat until/i), { target: { value: "2099-02-01" } });
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: "18:00" } });
    fireEvent.change(screen.getByLabelText(/finish time/i), { target: { value: "20:00" } });
    fireEvent.click(screen.getByRole("button", { name: /create series/i }));

    await waitFor(() => {
      expect(createSeries).toHaveBeenCalledWith(
        "3",
        expect.objectContaining({
          frequency: "weekly",
          start_date: "2099-01-01",
          end_date: "2099-02-01",
        }),
      );
    });
    expect(createEvent).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/club/3/events");
  });
});
