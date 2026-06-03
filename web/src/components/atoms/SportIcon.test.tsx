import { render, screen } from "../../test/renderWithTheme.tsx";

import { SportIcon } from "./SportIcon.tsx";

describe("SportIcon atom", () => {
  it("exposes an accessible name when a title is provided", () => {
    render(<SportIcon sport="football" title="Football" />);
    expect(screen.getByRole("img", { name: "Football" })).toBeInTheDocument();
  });

  it("is hidden from assistive tech when decorative (no title)", () => {
    const { container } = render(<SportIcon sport="tennis" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a glyph for every supported sport", () => {
    const sports = [
      "football",
      "basketball",
      "tennis",
      "padel",
      "hockey",
      "rugby",
      "volleyball",
      "badminton",
      "pool",
      "snooker",
    ] as const;
    sports.forEach((sport) => {
      const { container } = render(<SportIcon sport={sport} title={sport} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});
