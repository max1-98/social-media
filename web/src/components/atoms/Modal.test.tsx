import { vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";

import { Modal } from "./Modal.tsx";

describe("Modal atom", () => {
  it("renders title, children, and actions when open", () => {
    render(
      <Modal open onClose={vi.fn()} title="My dialog" actions={<button>Go</button>}>
        <p>Body content</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "My dialog" })).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Hidden">
        <p>Nope</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Closable">
        <p>Body</p>
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
