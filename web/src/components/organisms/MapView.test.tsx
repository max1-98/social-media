import type { ReactNode } from "react";
import { vi } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme.tsx";

import { MapView } from "./MapView.tsx";

// react-leaflet renders to a real DOM map that jsdom cannot host, so we stub it
// with lightweight elements that expose the props we assert on.
vi.mock("react-leaflet", () => ({
  MapContainer: ({
    children,
    "aria-label": label,
  }: {
    children: ReactNode;
    "aria-label"?: string;
  }) => (
    <div role="region" aria-label={label}>
      {children}
    </div>
  ),
  TileLayer: ({ attribution, url }: { attribution: string; url: string }) => (
    <div data-testid="tile-layer" data-url={url} data-attribution={attribution} />
  ),
  Marker: ({ children }: { children: ReactNode }) => <div data-testid="marker">{children}</div>,
  CircleMarker: ({ children }: { children: ReactNode }) => (
    <div data-testid="circle-marker">{children}</div>
  ),
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMapEvents: () => null,
}));

vi.mock("leaflet/dist/leaflet.css", () => ({}));

describe("MapView organism", () => {
  const center = { lat: 54.25, lng: -2.68 };

  it("renders an accessible map region with the OSM tile layer", () => {
    render(<MapView center={center} zoom={6} ariaLabel="Club discovery map" />);
    expect(screen.getByRole("region", { name: "Club discovery map" })).toBeInTheDocument();
    expect(screen.getByTestId("tile-layer")).toHaveAttribute(
      "data-url",
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
  });

  it("renders a marker per club and a circle marker for the user location", () => {
    render(
      <MapView
        center={center}
        zoom={6}
        clubs={[
          { id: "1", name: "Alpha Club", coordinates: { lat: 54, lng: -2 }, description: "Tennis" },
          { id: "2", name: "Beta Club", coordinates: { lat: 53, lng: -1 } },
        ]}
        userLocation={{ lat: 54.5, lng: -2.5 }}
      />,
    );
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(screen.getByTestId("circle-marker")).toBeInTheDocument();
    expect(screen.getByText("Alpha Club")).toBeInTheDocument();
    expect(screen.getByText("Tennis")).toBeInTheDocument();
  });

  it("invokes onClubSelect when a pin's popup is clicked", () => {
    const onClubSelect = vi.fn();
    render(
      <MapView
        center={center}
        zoom={6}
        clubs={[{ id: "42", name: "Gamma Club", coordinates: { lat: 54, lng: -2 } }]}
        onClubSelect={onClubSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Gamma Club/ }));
    expect(onClubSelect).toHaveBeenCalledWith("42");
  });
});
