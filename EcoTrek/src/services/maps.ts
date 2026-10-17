/** Google Maps links — these open the real Google Maps app/site, never OSM. */
export function googleMapsDirectionsUrl(dest: { startLat: number; startLng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.startLat},${dest.startLng}&travelmode=walking`;
}

export function googleMapsViewUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
