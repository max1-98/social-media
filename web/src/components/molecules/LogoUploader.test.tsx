import { vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../test/renderWithTheme.tsx";

import { LogoUploader } from "./LogoUploader.tsx";

// jsdom lacks object-URL helpers; define them for the local preview flow. We keep
// them in place (no unstub) so the unmount cleanup that revokes the URL always
// finds them, regardless of afterEach ordering.
URL.createObjectURL = vi.fn(() => "blob:preview");
URL.revokeObjectURL = vi.fn();

const noop = (): Promise<void> => Promise.resolve();

describe("LogoUploader molecule", () => {
  it("renders the empty drop zone when there is no logo", () => {
    render(<LogoUploader clubName="Aces" onUpload={noop} onRemove={noop} />);
    expect(screen.getByRole("button", { name: /upload club logo/i })).toBeInTheDocument();
    expect(screen.getByText(/choose a file or drag it here/i)).toBeInTheDocument();
  });

  it("uploads the selected file", async () => {
    const onUpload = vi.fn<(file: File) => Promise<void>>().mockResolvedValue(undefined);
    render(<LogoUploader clubName="Aces" onUpload={onUpload} onRemove={noop} />);
    const file = new File(["x"], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/club logo file/i), { target: { files: [file] } });
    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
    });
  });

  it("shows the preview and Replace/Remove when a logo exists", () => {
    render(
      <LogoUploader
        clubName="Aces"
        currentLogo="https://cdn.example/logo.png"
        onUpload={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByRole("img", { name: /aces logo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /replace logo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
    expect(screen.queryByText(/drag it here/i)).not.toBeInTheDocument();
  });

  it("removes the logo when Remove is clicked", async () => {
    const onRemove = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    render(
      <LogoUploader
        clubName="Aces"
        currentLogo="https://cdn.example/logo.png"
        onUpload={noop}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });

  it("surfaces an error when the upload fails", async () => {
    const onUpload = vi.fn<(file: File) => Promise<void>>().mockRejectedValue(new Error("boom"));
    render(<LogoUploader clubName="Aces" onUpload={onUpload} onRemove={noop} />);
    const file = new File(["x"], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/club logo file/i), { target: { files: [file] } });
    expect(await screen.findByText(/could not upload the logo/i)).toBeInTheDocument();
  });
});
