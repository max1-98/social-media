import { render, screen } from "../../test/renderWithTheme.tsx";

import { Badge } from "./Badge.tsx";

describe("Badge atom", () => {
  it("renders its count over the wrapped content", () => {
    render(
      <Badge badgeContent={4}>
        <span>Requests</span>
      </Badge>,
    );
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Requests")).toBeInTheDocument();
  });
});
