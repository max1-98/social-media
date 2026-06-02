import { render, screen } from "@testing-library/react";

import { Spinner } from "./Spinner.tsx";

describe("Spinner atom", () => {
  it("exposes a progressbar with a default accessible name", () => {
    render(<Spinner />);
    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeInTheDocument();
  });
});
