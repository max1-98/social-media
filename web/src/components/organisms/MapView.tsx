import "leaflet/dist/leaflet.css";

import type { LatLngBounds, Map as LeafletMap } from "leaflet";
import type { ReactElement } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";

import type { Coordinates } from "../../types";

/** A club rendered as a pin on the map. */
export interface MapClubMarker {
  id: string;
  name: string;
  coordinates: Coordinates;
  /** Optional secondary line, e.g. the sport or info blurb. */
  description?: string;
}

/** Geographic bounds reported on map move/zoom (for refetch-by-bounds). */
export interface MapBounds {
  northEast: Coordinates;
  southWest: Coordinates;
}

export interface MapViewProps {
  /** Initial map centre. */
  center: Coordinates;
  /** Initial zoom level. */
  zoom: number;
  /** Club pins to render. */
  clubs?: MapClubMarker[];
  /** Optional visitor location rendered as a highlighted circle. */
  userLocation?: Coordinates | null;
  /** Called whenever the user pans/zooms, with the new visible bounds. */
  onBoundsChange?: (bounds: MapBounds) => void;
  /** Called when a club pin's popup content is clicked. */
  onClubSelect?: (id: string) => void;
  /** Accessible label for the map region. */
  ariaLabel?: string;
  /** Extra class names for sizing the map container. */
  className?: string;
}

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function boundsOf(map: LeafletMap): MapBounds {
  const bounds: LatLngBounds = map.getBounds();
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return {
    northEast: { lat: ne.lat, lng: ne.lng },
    southWest: { lat: sw.lat, lng: sw.lng },
  };
}

/** Invisible child that wires leaflet move/zoom events to `onBoundsChange`. */
function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: MapBounds) => void }): null {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(boundsOf(map));
    },
    zoomend: () => {
      onBoundsChange(boundsOf(map));
    },
  });
  return null;
}

/**
 * Organism: an OpenStreetMap-backed Leaflet map. Renders club pins as
 * `Marker`+`Popup`, an optional visitor-location `CircleMarker`, and reports
 * visible bounds on pan/zoom so discovery pages can refetch by area. Geocoding
 * happens server-side via Nominatim — this component only displays results.
 */
export function MapView({
  center,
  zoom,
  clubs = [],
  userLocation = null,
  onBoundsChange,
  onClubSelect,
  ariaLabel = "Map of clubs",
  className,
}: MapViewProps): ReactElement {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      aria-label={ariaLabel}
      {...(className !== undefined ? { className } : {})}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_URL} />
      {onBoundsChange ? <BoundsWatcher onBoundsChange={onBoundsChange} /> : null}
      {userLocation ? (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={8}
          pathOptions={{ color: "green", fillColor: "green", fillOpacity: 0.7, weight: 2 }}
        >
          <Popup>Your location</Popup>
        </CircleMarker>
      ) : null}
      {clubs.map((club) => (
        <Marker key={club.id} position={[club.coordinates.lat, club.coordinates.lng]}>
          <Popup>
            <button
              type="button"
              onClick={() => onClubSelect?.(club.id)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                cursor: onClubSelect ? "pointer" : "default",
                textAlign: "left",
              }}
            >
              <strong>{club.name}</strong>
              {club.description !== undefined && club.description !== "" ? (
                <>
                  <br />
                  {club.description}
                </>
              ) : null}
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
