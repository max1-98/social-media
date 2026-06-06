import { vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";

import { RadioGroup } from "./RadioGroup.tsx";

const options = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
];

describe("RadioGroup atom", () => {
  it("renders the group label and options", () => {
    render(<RadioGroup label="Pick one" options={options} value="a" onChange={vi.fn()} />);
    expect(screen.getByText("Pick one")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Option A" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Option B" })).not.toBeChecked();
  });

  it("emits the selected value on change", () => {
    const onChange = vi.fn<(value: string) => void>();
    render(<RadioGroup label="Pick one" options={options} value="a" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Option B" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
