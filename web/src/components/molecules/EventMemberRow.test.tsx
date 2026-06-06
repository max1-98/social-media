import { vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";
import type { MemberEvent } from "../../types";

import { EventMemberRow } from "./EventMemberRow.tsx";

const ranked: MemberEvent = {
  id: "7",
  first_name: "Ada",
  surname: "Lovelace",
  username: "ada",
  elo: 1234,
};

describe("EventMemberRow molecule", () => {
  it("shows the member's name, handle and ELO", () => {
    render(
      <ul>
        <EventMemberRow member={ranked} actionLabel="Deactivate" onAction={vi.fn()} />
      </ul>,
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("@ada")).toBeInTheDocument();
    expect(screen.getByText("1234")).toBeInTheDocument();
  });

  it("renders an Unranked chip when the member has no ELO", () => {
    render(
      <ul>
        <EventMemberRow
          member={{ ...ranked, elo: null }}
          actionLabel="Activate"
          onAction={vi.fn()}
        />
      </ul>,
    );
    expect(screen.getByText("Unranked")).toBeInTheDocument();
  });

  it("fires the action with the member id", () => {
    const onAction = vi.fn();
    render(
      <ul>
        <EventMemberRow member={ranked} actionLabel="Deactivate" onAction={onAction} />
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: /deactivate ada lovelace/i }));
    expect(onAction).toHaveBeenCalledWith("7");
  });

  it("falls back to the username when names are blank", () => {
    render(
      <ul>
        <EventMemberRow
          member={{ ...ranked, first_name: "", surname: "" }}
          actionLabel="Activate"
          onAction={vi.fn()}
        />
      </ul>,
    );
    expect(screen.getByText("ada")).toBeInTheDocument();
  });
});
