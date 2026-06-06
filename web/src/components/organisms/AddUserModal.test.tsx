import { vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../test/renderWithTheme.tsx";
import type { SearchedUser, UserSearchPage } from "../../types";

import { AddUserModal } from "./AddUserModal.tsx";

type Search = (q: string, page: number) => Promise<UserSearchPage>;

const alice: SearchedUser = {
  id: "u1",
  username: "alice",
  first_name: "Alice",
  surname: "Adams",
};

function renderModal(overrides?: {
  onCreateDummyUser?: (draft: unknown) => Promise<void>;
  onInviteMember?: (userId: string) => Promise<void>;
  onSearch?: Search;
  onClose?: () => void;
}): {
  onCreateDummyUser: ReturnType<typeof vi.fn>;
  onInviteMember: ReturnType<typeof vi.fn>;
  onClose: ReturnType<typeof vi.fn>;
} {
  const onCreateDummyUser =
    overrides?.onCreateDummyUser ?? vi.fn<(draft: unknown) => Promise<void>>().mockResolvedValue();
  const onInviteMember =
    overrides?.onInviteMember ?? vi.fn<(userId: string) => Promise<void>>().mockResolvedValue();
  const onSearch =
    overrides?.onSearch ??
    vi.fn<Search>().mockResolvedValue({ results: [alice], page: 1, has_next: false });
  const onClose = overrides?.onClose ?? vi.fn();
  render(
    <AddUserModal
      open
      onClose={onClose}
      onCreateDummyUser={onCreateDummyUser}
      onInviteMember={onInviteMember}
      onSearch={onSearch}
    />,
  );
  return {
    onCreateDummyUser: onCreateDummyUser as ReturnType<typeof vi.fn>,
    onInviteMember: onInviteMember as ReturnType<typeof vi.fn>,
    onClose: onClose as ReturnType<typeof vi.fn>,
  };
}

describe("AddUserModal organism", () => {
  it("defaults to dummy mode with a Cancel + Create footer", () => {
    renderModal();
    expect(screen.getByRole("form", { name: /add a dummy user/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite" })).not.toBeInTheDocument();
  });

  it("switches to search mode with a Cancel + Invite footer", () => {
    renderModal();
    fireEvent.click(screen.getByRole("radio", { name: "Search member" }));
    expect(screen.getByRole("form", { name: /search members/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create" })).not.toBeInTheDocument();
  });

  it("creates a dummy user from the footer button", async () => {
    const { onCreateDummyUser } = renderModal();
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Surname"), { target: { value: "Lovelace" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => {
      expect(onCreateDummyUser).toHaveBeenCalledWith({
        first_name: "Ada",
        surname: "Lovelace",
        biological_gender: "male",
      });
    });
  });

  it("keeps Invite disabled until a member is selected, then invites", async () => {
    const { onInviteMember } = renderModal();
    fireEvent.click(screen.getByRole("radio", { name: "Search member" }));
    expect(screen.getByRole("button", { name: "Invite" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "ali" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(await screen.findByText("@alice"));

    expect(screen.getByRole("button", { name: "Invite" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Invite" }));
    await waitFor(() => {
      expect(onInviteMember).toHaveBeenCalledWith("u1");
    });
  });

  it("closes on Cancel", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});
