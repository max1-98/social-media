import { render, screen } from "@testing-library/react";

import { Input } from "./Input.tsx";

describe("Input atom", () => {
  it("exposes its label as the accessible name", () => {
    render(<Input label="Email" />);
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
  });
});
