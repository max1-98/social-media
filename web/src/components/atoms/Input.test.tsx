import { render, screen } from "../../test/renderWithTheme.tsx";

import { Input } from "./Input.tsx";

describe("Input atom", () => {
  it("exposes its label as the accessible name", () => {
    render(<Input label="Email" />);
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
  });
});
