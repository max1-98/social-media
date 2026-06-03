import { render, screen } from "../../test/renderWithTheme.tsx";

import { Button } from "./Button.tsx";

describe("Button atom", () => {
  it("renders its children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });
});
