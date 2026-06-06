import { vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../test/renderWithTheme.tsx";
import type { SearchedUser, UserSearchPage } from "../../types";

import { MemberSearchForm } from "./MemberSearchForm.tsx";

const user = (id: string, username: string): SearchedUser => ({
  id,
  username,
  first_name: "First",
  surname: "Last",
});

type Search = (q: string, page: number) => Promise<UserSearchPage>;

describe("MemberSearchForm molecule", () => {
  it("searches by username and lists results", async () => {
    const onSearch = vi.fn<Search>().mockResolvedValue({
      results: [user("u1", "alice"), user("u2", "alicia")],
      page: 1,
      has_next: false,
    });
    render(<MemberSearchForm onSearch={onSearch} onSelectionChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "ali" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith("ali", 1);
    });
    expect(await screen.findByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("@alicia")).toBeInTheDocument();
  });

  it("reports the selected user to the parent", async () => {
    const onSelectionChange = vi.fn<(u: SearchedUser | null) => void>();
    const onSearch = vi.fn<Search>().mockResolvedValue({
      results: [user("u1", "alice")],
      page: 1,
      has_next: false,
    });
    render(<MemberSearchForm onSearch={onSearch} onSelectionChange={onSelectionChange} />);

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "ali" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const result = await screen.findByText("@alice");
    fireEvent.click(result);

    expect(onSelectionChange).toHaveBeenLastCalledWith(user("u1", "alice"));
  });

  it("paginates with Next when more results exist", async () => {
    const onSearch = vi
      .fn<Search>()
      .mockResolvedValueOnce({ results: [user("u1", "alice")], page: 1, has_next: true })
      .mockResolvedValueOnce({ results: [user("u2", "alicia")], page: 2, has_next: false });
    render(<MemberSearchForm onSearch={onSearch} onSelectionChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "ali" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("@alice");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(onSearch).toHaveBeenLastCalledWith("ali", 2);
    });
    expect(await screen.findByText("@alicia")).toBeInTheDocument();
  });
});
