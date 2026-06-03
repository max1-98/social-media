import { vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";

import { ScoreInput } from "./ScoreInput.tsx";

describe("ScoreInput molecule", () => {
  it("submits the score as a 't1,t2' string once a team reaches the winning score", () => {
    const onSubmit = vi.fn<(score: string) => void>();
    render(<ScoreInput onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Team 1 score"), { target: { value: "21" } });
    fireEvent.change(screen.getByLabelText("Team 2 score"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: /submit score/i }));

    expect(onSubmit).toHaveBeenCalledWith("21,15");
  });

  it("blocks submission until a team reaches the winning score", () => {
    const onSubmit = vi.fn<(score: string) => void>();
    render(<ScoreInput onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Team 1 score"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /submit score/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/must reach 21/i)).toBeInTheDocument();
  });

  it("disables the submit button while disabled", () => {
    render(<ScoreInput onSubmit={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /submit score/i })).toBeDisabled();
  });
});
