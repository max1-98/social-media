import { vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";

import { SortControl } from "./SortControl.tsx";

const options = [
  { value: "elo", label: "ELO" },
  { value: "name", label: "Name" },
];

describe("SortControl molecule", () => {
  it("emits the chosen sort key", () => {
    const onSortKeyChange = vi.fn();
    render(
      <SortControl
        sortKey="elo"
        direction="desc"
        options={options}
        onSortKeyChange={onSortKeyChange}
        onDirectionToggle={vi.fn()}
      />,
    );
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Sort by" }));
    fireEvent.click(screen.getByRole("option", { name: "Name" }));
    expect(onSortKeyChange).toHaveBeenCalledWith("name");
  });

  it("toggles direction and reflects it in the button label", () => {
    const onDirectionToggle = vi.fn();
    const { rerender } = render(
      <SortControl
        sortKey="elo"
        direction="desc"
        options={options}
        onSortKeyChange={vi.fn()}
        onDirectionToggle={onDirectionToggle}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /sort descending/i }));
    expect(onDirectionToggle).toHaveBeenCalledTimes(1);

    rerender(
      <SortControl
        sortKey="elo"
        direction="asc"
        options={options}
        onSortKeyChange={vi.fn()}
        onDirectionToggle={onDirectionToggle}
      />,
    );
    expect(screen.getByRole("button", { name: /sort ascending/i })).toBeInTheDocument();
  });
});
