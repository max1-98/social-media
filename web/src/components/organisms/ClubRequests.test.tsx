import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { MemberRequest } from "../../types";

import { ClubRequests } from "./ClubRequests.tsx";

const requests: MemberRequest[] = [
  { id: 11, club: 1, user: 5, username: "newbie", date_requested: "2026-01-15T10:00:00Z" },
];

describe("ClubRequests organism", () => {
  it("lists pending requests with accept/reject actions", () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(<ClubRequests requests={requests} onAccept={onAccept} onReject={onReject} />);
    expect(screen.getByText("newbie")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /accept/i }));
    fireEvent.click(screen.getByRole("button", { name: /decline/i }));
    expect(onAccept).toHaveBeenCalledWith(requests[0]);
    expect(onReject).toHaveBeenCalledWith(requests[0]);
  });

  it("shows an empty state when there are no requests", () => {
    render(<ClubRequests requests={[]} />);
    expect(screen.getByText(/no member requests/i)).toBeInTheDocument();
  });
});
