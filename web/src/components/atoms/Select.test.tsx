import { render, screen } from "@testing-library/react";

import { Select } from "./Select.tsx";

describe("Select atom", () => {
  it("exposes its label as the accessible name", () => {
    render(
      <Select
        label="Sport"
        value="tennis"
        options={[
          { value: "tennis", label: "Tennis" },
          { value: "squash", label: "Squash" },
        ]}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Sport" })).toBeInTheDocument();
  });
});
