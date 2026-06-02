import { render, screen } from "@testing-library/react";

import { Link } from "./Link.tsx";

describe("Link atom", () => {
  it("renders an accessible link to its href", () => {
    render(<Link href="/privacy">Privacy</Link>);
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });
});
