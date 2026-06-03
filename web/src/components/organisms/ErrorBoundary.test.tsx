import { vi } from "vitest";

import { render, screen } from "../../test/renderWithTheme.tsx";

import { ErrorBoundary } from "./ErrorBoundary.tsx";

function Boom(): never {
  throw new Error("kaboom");
}

describe("ErrorBoundary organism", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <span>safe content</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe content")).toBeInTheDocument();
  });

  it("renders the default fallback and a reset button when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders a custom fallback when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary fallback={<span>custom fallback</span>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    spy.mockRestore();
  });
});
