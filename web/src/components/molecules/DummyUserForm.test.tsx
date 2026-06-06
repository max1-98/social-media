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

  it("hides its own button and adopts the form id when embedded", async () => {
    const onSubmit = vi.fn<Submit>().mockResolvedValue();
    render(<DummyUserForm onSubmit={onSubmit} formId="embedded-form" />);
    // No internal submit button — an external footer button drives submission.
    expect(screen.queryByRole("button", { name: /add dummy user/i })).not.toBeInTheDocument();
    const form = screen.getByRole("form", { name: /add a dummy user/i });
    expect(form).toHaveAttribute("id", "embedded-form");

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Surname"), { target: { value: "Lovelace" } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        first_name: "Ada",
        surname: "Lovelace",
        biological_gender: "male",
      });
    });
  });
});
