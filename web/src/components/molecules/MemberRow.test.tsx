import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { Member } from "../../types";

import { MemberRow } from "./MemberRow.tsx";

const baseMember: Member = {
  id: 7,
  first_name: "Ada",
  surname: "Lovelace",
  username: "ada",
  is_club_admin: false,
};

describe("MemberRow molecule", () => {
  it("shows the member's name and handle inside a list", () => {
    render(
      <ul>
        <MemberRow member={baseMember} />
      </ul>,
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("@ada")).toBeInTheDocument();
  });

  it("renders an admin badge for admins", () => {
    render(
      <ul>
        <MemberRow member={{ ...baseMember, is_club_admin: true }} />
      </ul>,
    );
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("promotes a non-admin when the viewer manages admins", () => {
    const onPromote = vi.fn();
    render(
      <ul>
        <MemberRow member={baseMember} canManageAdmins onPromote={onPromote} />
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: /make admin/i }));
    expect(onPromote).toHaveBeenCalledWith(baseMember);
  });

  it("demotes an admin and removes a member via callbacks", () => {
    const onDemote = vi.fn();
    const onRemove = vi.fn();
    const admin: Member = { ...baseMember, is_club_admin: true };
    render(
      <ul>
        <MemberRow
          member={admin}
          canManageAdmins
          canRemove
          onDemote={onDemote}
          onRemove={onRemove}
        />
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: /remove admin/i }));
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));
    expect(onDemote).toHaveBeenCalledWith(admin);
    expect(onRemove).toHaveBeenCalledWith(admin);
  });

  it("hides management actions for unprivileged viewers", () => {
    render(
      <ul>
        <MemberRow member={baseMember} />
      </ul>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
