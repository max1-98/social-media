import { vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../test/renderWithTheme.tsx";

import { DummyUserForm } from "./DummyUserForm.tsx";
import type { DummyUserDraft } from "./DummyUserForm.tsx";

type Submit = (draft: DummyUserDraft) => Promise<void>;

describe("DummyUserForm molecule", () => {
  it("submits the entered name and default gender via the callback", async () => {
    const onSubmit = vi.fn<Submit>().mockResolvedValue();
    render(<DummyUserForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Surname"), { target: { value: "Lovelace" } });
    fireEvent.click(screen.getByRole("button", { name: /add dummy user/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        first_name: "Ada",
        surname: "Lovelace",
        biological_gender: "male",
      });
    });
  });

  it("blocks submission when a name is missing", () => {
    const onSubmit = vi.fn<Submit>();
    render(<DummyUserForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /add dummy user/i }));
    expect(screen.getByText(/enter a first name and surname/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces an error when saving fails", async () => {
    const onSubmit = vi.fn<Submit>().mockRejectedValue(new Error("boom"));
    render(<DummyUserForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Surname"), { target: { value: "Lovelace" } });
    fireEvent.click(screen.getByRole("button", { name: /add dummy user/i }));
    expect(await screen.findByText(/could not add that dummy user/i)).toBeInTheDocument();
  });
});
