import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import type { Sport } from "../../types";

import { SportForm } from "./SportForm.tsx";

const sports: Sport[] = [{ name: "tennis" }, { name: "padel" }];

describe("SportForm molecule", () => {
  it("submits the pre-selected sport via the callback", async () => {
    const onSubmit = vi.fn<(sport: string) => Promise<void>>().mockResolvedValue();
    render(<SportForm sports={sports} initialSport="tennis" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /add sport/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("tennis");
    });
  });

  it("blocks submission when no sport is chosen", () => {
    const onSubmit = vi.fn<(sport: string) => Promise<void>>();
    render(<SportForm sports={sports} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /add sport/i }));
    expect(screen.getByText(/choose a sport/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces an error when saving fails", async () => {
    const onSubmit = vi.fn<(sport: string) => Promise<void>>().mockRejectedValue(new Error("boom"));
    render(<SportForm sports={sports} initialSport="padel" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /add sport/i }));
    expect(await screen.findByText(/could not save that sport/i)).toBeInTheDocument();
  });
});
