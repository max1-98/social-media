import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { Member } from "../../types";

import { MemberTable } from "./MemberTable.tsx";

const members: Member[] = [
  { id: 1, first_name: "Ada", surname: "Lovelace", username: "ada", is_club_admin: true },
  { id: 2, first_name: "Alan", surname: "Turing", username: "alan", is_club_admin: false },
];

describe("MemberTable organism", () => {
  it("lists members with an accessible label", () => {
    render(<MemberTable members={members} />);
    expect(screen.getByRole("list", { name: "Club members" })).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
  });

  it("shows an empty message with no members", () => {
    render(<MemberTable members={[]} />);
    expect(screen.getByText(/no members yet/i)).toBeInTheDocument();
  });

  it("wires president admin actions and admin removal", () => {
    const onDemote = vi.fn();
    const onPromote = vi.fn();
    const onRemove = vi.fn();
    render(
      <MemberTable
        members={members}
        isPresident
        isAdmin
        onPromote={onPromote}
        onDemote={onDemote}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /remove admin/i }));
    fireEvent.click(screen.getByRole("button", { name: /make admin/i }));
    expect(onDemote).toHaveBeenCalledWith(members[0]);
    expect(onPromote).toHaveBeenCalledWith(members[1]);
    expect(screen.getAllByRole("button", { name: /^remove$/i })).toHaveLength(2);
  });
});
