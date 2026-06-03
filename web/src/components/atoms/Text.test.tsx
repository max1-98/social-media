import { render, screen } from "../../test/renderWithTheme.tsx";

import { Text } from "./Text.tsx";

describe("Text atom", () => {
  it("renders a heading with its content as the accessible name", () => {
    render(<Text variant="h1">Welcome</Text>);
    expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
  });
});
