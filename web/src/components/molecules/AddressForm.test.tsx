import { vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../test/renderWithTheme.tsx";

import { AddressForm } from "./AddressForm.tsx";
import type { AddressResult } from "./AddressForm.tsx";

describe("AddressForm molecule", () => {
  it("joins the fields and resolves the address, surfacing the formatted result", async () => {
    const onSubmit = vi.fn<(address: string) => Promise<AddressResult>>().mockResolvedValue({
      lat_lng: { lat: 51.5074, lng: -0.1278 },
      formatted_address: "10 High Street, London, SW1A 1AA",
    });
    render(<AddressForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Street"), { target: { value: "10 High St" } });
    fireEvent.change(screen.getByLabelText("Town"), { target: { value: "London" } });
    fireEvent.change(screen.getByLabelText("Postcode"), { target: { value: "SW1" } });
    fireEvent.click(screen.getByRole("button", { name: /submit address/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("10 High St, London, SW1");
    });
    expect(await screen.findByText(/10 High Street, London, SW1A 1AA/)).toBeInTheDocument();
  });

  it("shows an error when no address parts are entered", () => {
    const onSubmit = vi.fn<(address: string) => Promise<AddressResult>>();
    render(<AddressForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /submit address/i }));
    expect(screen.getByText(/at least one part/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces a friendly error when geocoding fails", async () => {
    const onSubmit = vi
      .fn<(address: string) => Promise<AddressResult>>()
      .mockRejectedValue(new Error("not found"));
    render(<AddressForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Town"), { target: { value: "Nowhere" } });
    fireEvent.click(screen.getByRole("button", { name: /submit address/i }));
    expect(await screen.findByText(/could not find that address/i)).toBeInTheDocument();
  });
});
