// Type declarations for react-leaflet
// TODO: Install @types/leaflet for proper types
declare module 'react-leaflet' {
  export const MapContainer: any;
  export const Marker: any;
  export const Popup: any;
  export const CircleMarker: any;
}

declare module 'react-leaflet/TileLayer' {
  export const TileLayer: any;
  export default TileLayer;
}
