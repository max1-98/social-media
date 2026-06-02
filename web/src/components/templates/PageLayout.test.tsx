import { render, screen } from "@testing-library/react";

import { PageLayout } from "./PageLayout.tsx";

describe("PageLayout template", () => {
  it("renders the content and footer policy links", () => {
    render(
      <PageLayout navbar={<nav aria-label="Main">nav</nav>}>
        <p>Home content</p>
      </PageLayout>,
    );
    expect(screen.getByText("Home content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy-policy",
    );
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });
});
