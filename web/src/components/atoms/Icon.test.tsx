import HomeIcon from "@mui/icons-material/Home";

import { render, screen } from "../../test/renderWithTheme.tsx";

import { Icon } from "./Icon.tsx";

describe("Icon atom", () => {
  it("renders the given icon with an accessible title", () => {
    render(<Icon as={HomeIcon} titleAccess="Home" />);
    expect(screen.getByTitle("Home")).toBeInTheDocument();
  });
});
