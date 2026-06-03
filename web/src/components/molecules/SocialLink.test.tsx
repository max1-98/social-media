import { render, screen } from "../../test/renderWithTheme.tsx";

import { SocialLink } from "./SocialLink.tsx";

describe("SocialLink molecule", () => {
  it("renders a labelled link that opens safely in a new tab", () => {
    render(<SocialLink social={{ platform: "facebook", url: "https://fb.com/club" }} />);
    const link = screen.getByRole("link", { name: "Facebook" });
    expect(link).toHaveAttribute("href", "https://fb.com/club");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("falls back to the website label for unknown platforms", () => {
    render(<SocialLink social={{ platform: "mystery", url: "https://example.com" }} />);
    expect(screen.getByRole("link", { name: "Website" })).toBeInTheDocument();
  });
});
