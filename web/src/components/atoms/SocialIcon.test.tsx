import { render } from "../../test/renderWithTheme.tsx";

import { SocialIcon } from "./SocialIcon.tsx";

describe("SocialIcon atom", () => {
  it("renders an svg for each supported platform", () => {
    const platforms = ["facebook", "whatsapp", "instagram", "website"] as const;
    platforms.forEach((platform) => {
      const { container } = render(<SocialIcon platform={platform} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  it("exposes an accessible name via titleAccess", () => {
    const { getByTitle } = render(<SocialIcon platform="facebook" titleAccess="Facebook" />);
    expect(getByTitle("Facebook")).toBeInTheDocument();
  });
});
