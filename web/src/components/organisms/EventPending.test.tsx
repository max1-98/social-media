import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { EventDetail } from "../../types";

import { EventPending } from "./EventPending.tsx";

const event: EventDetail = {
  id: 1,
  game_type: { name: "tennis singles" },
  date: "2026-07-01",
  start_time: "18:00",
  finish_time: "20:00",
  number_of_courts: 2,
  sbmm: true,
  guests_allowed: false,
  over_18_under_18_mixed: "all ages",
  active_members: [],
  in_game_members: [],
  event_active: false,
  event_complete: false,
  mode: "sbmm",
  even_teams: true,
  team_size: 1,
};

describe("EventPending organism", () => {
  it("lets an admin start the event", () => {
    const onStart = vi.fn();
    render(<EventPending event={event} isAdmin onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: "Start event" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("hides the start button from non-admins", () => {
    render(<EventPending event={event} isAdmin={false} onStart={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Start event" })).not.toBeInTheDocument();
    expect(screen.getByText(/has not started yet/i)).toBeInTheDocument();
  });
});
