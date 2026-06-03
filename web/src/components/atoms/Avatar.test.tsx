import { render, screen } from "../../test/renderWithTheme.tsx";

import { Avatar } from "./Avatar.tsx";

describe("Avatar atom", () => {
  it("renders its initials fallback content", () => {
    render(<Avatar>AB</Avatar>);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });
});
