import { render, screen } from "../../test/renderWithTheme.tsx";

import { Chip } from "./Chip.tsx";

describe("Chip atom", () => {
  it("renders its label", () => {
    render(<Chip label="1234" />);
    expect(screen.getByText("1234")).toBeInTheDocument();
  });

  it("renders with an energy palette token applied via sx", () => {
    render(<Chip label="Top" sx={{ bgcolor: "energy.main", color: "energy.contrastText" }} />);
    expect(screen.getByText("Top")).toBeInTheDocument();
  });
});
