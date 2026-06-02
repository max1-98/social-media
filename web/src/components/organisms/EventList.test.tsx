import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { Event } from "../../types";

import { EventList } from "./EventList.tsx";

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: 1,
    date: "2026-07-01",
    start_time: "18:00",
    finish_time: "20:00",
    number_of_courts: 4,
    sbmm: true,
    guests_allowed: false,
    over_18_under_18_mixed: "all ages",
    event_active: false,
    event_complete: false,
    club: { id: 9, name: "Smash Club", logo: "logo.png" },
    game_type: { name: "badminton doubles" },
    ...overrides,
  };
}

describe("EventList organism", () => {
  it("groups events into active, upcoming and past sections", () => {
    const events: Event[] = [
      makeEvent({ id: 1, event_active: true, event_complete: false }),
      makeEvent({ id: 2, event_active: false }),
      makeEvent({ id: 3, event_active: true, event_complete: true }),
    ];
    render(<EventList events={events} onSelectEvent={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Active events" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Upcoming events" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Past events" })).toBeInTheDocument();
  });

  it("shows empty text when a group has no events", () => {
    render(<EventList events={[]} onSelectEvent={vi.fn()} />);
    expect(screen.getByText("No upcoming events.")).toBeInTheDocument();
  });

  it("calls onSelectEvent when a card is activated", () => {
    const onSelect = vi.fn<(event: Event) => void>();
    const event = makeEvent({ id: 5 });
    render(<EventList events={[event]} onSelectEvent={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /smash club badminton doubles/i }));
    expect(onSelect).toHaveBeenCalledWith(event);
  });
});
