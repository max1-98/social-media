import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormField } from "./FormField.tsx";

describe("FormField molecule", () => {
  it("renders an input reachable by its label and reports changes", () => {
    const onChange = vi.fn<(value: string) => void>();
    render(<FormField label="Email" name="email" value="" onChange={onChange} type="email" />);

    const input = screen.getByLabelText("Email");
    fireEvent.change(input, { target: { value: "a@b.com" } });
    expect(onChange).toHaveBeenCalledWith("a@b.com");
  });

  it("shows the error message and marks the field invalid", () => {
    render(
      <FormField
        label="Username"
        name="username"
        value="x"
        onChange={vi.fn()}
        error="Already taken"
      />,
    );
    expect(screen.getByText("Already taken")).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/)).toBeInvalid();
  });

  it("shows helper text when there is no error", () => {
    render(
      <FormField
        label="Name"
        name="name"
        value=""
        onChange={vi.fn()}
        helperText="As it appears on your ID"
      />,
    );
    expect(screen.getByText("As it appears on your ID")).toBeInTheDocument();
  });
});
