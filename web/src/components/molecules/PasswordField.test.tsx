import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";

import { PasswordField } from "./PasswordField.tsx";

describe("PasswordField molecule", () => {
  it("starts hidden and reports changes", () => {
    const onChange = vi.fn<(value: string) => void>();
    render(<PasswordField label="Password" name="password" value="" onChange={onChange} />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.change(input, { target: { value: "secret" } });
    expect(onChange).toHaveBeenCalledWith("secret");
  });

  it("toggles visibility via an accessible button", () => {
    render(<PasswordField label="Password" name="password" value="secret" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("shows the error message", () => {
    render(
      <PasswordField
        label="Password"
        name="password"
        value=""
        onChange={vi.fn()}
        error="Too short"
      />,
    );
    expect(screen.getByText("Too short")).toBeInTheDocument();
  });
});
