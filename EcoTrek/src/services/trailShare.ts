import type { Trail } from '../constants/austinTrails';
import type { TrailPhoto } from './trailPhotos';

/** Build a focused share message for one selected trail and its photo links. */
export function buildTrailShareMessage(trail: Trail, photos: TrailPhoto[] = []): string {
  const miles = Number.isFinite(trail.distanceMiles) ? Math.max(0, trail.distanceMiles) : 0;
  const kilometres = miles * 1.60934;
  const number = (value: number) => Number(value.toFixed(1)).toString();
  const description = typeof trail.description === 'string' ? trail.description.replace(/\s+/g, ' ').trim() : '';
  const hasCoordinates = Number.isFinite(trail.startLat) && Math.abs(trail.startLat) <= 90
    && Number.isFinite(trail.startLng) && Math.abs(trail.startLng) <= 180;
  const lat = hasCoordinates ? trail.startLat.toFixed(5) : '';
  const lon = hasCoordinates ? trail.startLng.toFixed(5) : '';
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
    : '';
  const seen = new Set<string>();
  const selectedPhotos = [
    ...photos,
    ...(trail.photos ?? []),
    ...(trail.imageUrl ? [{ url: trail.imageUrl, thumbUrl: trail.imageUrl, title: `${trail.name} trail photo`, kind: 'scenery' as const }] : []),
  ].filter((photo) => {
    if (!/^https?:\/\//i.test(photo.url) || seen.has(photo.url)) return false;
    seen.add(photo.url);
    return true;
  }).slice(0, 2);

  return [
    `🥾 ${trail.name}`,
    trail.area,
    `${number(miles)} mi (${number(kilometres)} km) · ${trail.difficulty}`,
    description ? `${description.slice(0, 220)}${description.length > 220 ? '…' : ''}` : '',
    mapUrl ? `Trailhead map: ${mapUrl}` : '',
    selectedPhotos.length
      ? `Photos:\n${selectedPhotos.map((photo) => `${photo.title}: ${photo.url}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n');
}
