import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { render, screen } from "../test/renderWithTheme.tsx";
import type { Event } from "../types";

import { MyEventsPage } from "./MyEventsPage.tsx";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const myEvents = vi.fn<() => Promise<Event[]>>();
vi.mock("../api", () => ({
  ApiRequestError: class extends Error {},
  eventsApi: { myEvents: () => myEvents() },
}));

vi.mock("../components/organisms", () => ({
  EventList: ({ events }: { events: Event[] }) => (
    <div data-testid="event-list">{events.length} events</div>
  ),
}));

describe("MyEventsPage", () => {
  it("offers a create-event action that routes to the club picker", async () => {
    myEvents.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <MyEventsPage />
      </MemoryRouter>,
    );
    const button = await screen.findByRole("button", { name: /create event/i });
    button.click();
    expect(navigate).toHaveBeenCalledWith("/event/create");
  });
});
