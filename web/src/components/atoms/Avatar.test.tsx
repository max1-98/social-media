import { render, screen } from "@testing-library/react";

import { Avatar } from "./Avatar.tsx";

describe("Avatar atom", () => {
  it("renders its initials fallback content", () => {
    render(<Avatar>AB</Avatar>);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });
});
