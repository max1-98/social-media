import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";

import { Navbar } from "./Navbar.tsx";

function renderNavbar(props?: Partial<Parameters<typeof Navbar>[0]>): {
  onLogout: ReturnType<typeof vi.fn>;
} {
  const onLogout = vi.fn();
  render(
    <MemoryRouter>
      <Navbar user={{ username: "alice" }} onLogout={onLogout} {...props} />
    </MemoryRouter>,
  );
  return { onLogout };
}

describe("Navbar organism", () => {
  it("shows the signed-in username", () => {
    renderNavbar();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("opens the navigation drawer and exposes nav landmark + links", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Discover clubs" })).toBeInTheDocument();
  });

  it("invokes onLogout when the logout button is pressed", () => {
    const { onLogout } = renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("hides logout when anonymous", () => {
    renderNavbar({ user: null });
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.queryByRole("button", { name: /logout/i })).not.toBeInTheDocument();
  });
});
