import { renderWithTheme, screen } from "../../test/renderWithTheme.tsx";

import { AuthCard } from "./AuthCard.tsx";

describe("AuthCard organism", () => {
  it("renders the brand, title, subtitle and children", () => {
    renderWithTheme(
      <AuthCard title="Log in" subtitle="Welcome back">
        <button type="submit">Continue</button>
      </AuthCard>,
    );
    expect(screen.getByText("Sports Social")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("omits the subtitle when not provided", () => {
    renderWithTheme(
      <AuthCard title="Reset password">
        <span>body</span>
      </AuthCard>,
    );
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });
});
