import { render, screen } from "../../test/renderWithTheme.tsx";

import { Alert } from "./Alert.tsx";

describe("Alert atom", () => {
  it("renders an error message with the alert role", () => {
    render(<Alert severity="error">Something broke</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Something broke");
  });
});
