import { describe, expect, it, vi } from "vitest";

import { act, fireEvent, render, screen } from "../../test/renderWithTheme.tsx";

import { ConsentBanner } from "./ConsentBanner.tsx";

describe("ConsentBanner organism", () => {
  it("renders pre-choice with accessible region and Accept/Refuse + policy links", () => {
    render(<ConsentBanner open onAccept={vi.fn()} onRefuse={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Cookie consent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refuse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cookie Policy" })).toHaveAttribute(
      "href",
      "/cookie-policy",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy-policy",
    );
  });

  it("hides once a choice exists (open=false)", () => {
    render(<ConsentBanner open={false} onAccept={vi.fn()} onRefuse={vi.fn()} />);
    expect(screen.queryByRole("region", { name: "Cookie consent" })).not.toBeInTheDocument();
  });

  it("invokes onAccept when Accept is clicked", () => {
    const onAccept = vi.fn();
    render(<ConsentBanner open onAccept={onAccept} onRefuse={vi.fn()} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    });
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("invokes onRefuse when Refuse is clicked", () => {
    const onRefuse = vi.fn();
    render(<ConsentBanner open onAccept={vi.fn()} onRefuse={onRefuse} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Refuse" }));
    });
    expect(onRefuse).toHaveBeenCalledOnce();
  });
});
