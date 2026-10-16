import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import * as L from 'leaflet';
import { googleMapsViewUrl } from '../services/maps';

import Icon from './Icon';
import RouteSketch from './RouteSketch';
import type { Coord } from '../services/location';
import { RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export type LiveMapProps = {
  path: Coord[];
  current?: Coord;
  height?: number | '100%';
  follow?: boolean;
};

const AUSTIN: L.LatLngTuple = [30.2672, -97.7431];
// Google Maps tiles (the web build previously rendered OpenStreetMap here,
// which is why Start appeared to "pop up in OpenStreetMap"). No API key is
// needed for tile display; the "Google Maps" button below opens the real
// Google Maps site/app for directions.
const TILE_URL = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

// Bundle the small amount of Leaflet CSS we use with the app. No CDN scripts,
// icon downloads, map API keys, or billing setup are needed to render this map.
const MAP_CSS = `
.ecotrek-map .leaflet-pane,.ecotrek-map .leaflet-tile,.ecotrek-map .leaflet-marker-icon,.ecotrek-map .leaflet-marker-shadow,.ecotrek-map .leaflet-tile-container,.ecotrek-map .leaflet-pane>svg,.ecotrek-map .leaflet-pane>canvas,.ecotrek-map .leaflet-zoom-box{position:absolute;left:0;top:0}
.ecotrek-map .leaflet-tile{visibility:hidden;user-select:none;-webkit-user-drag:none}
.ecotrek-map .leaflet-tile-loaded{visibility:inherit}
.ecotrek-map .leaflet-zoom-animated{transform-origin:0 0}
.ecotrek-map .leaflet-pane{z-index:400}
.ecotrek-map .leaflet-tile-pane{z-index:200}
.ecotrek-map .leaflet-overlay-pane{z-index:400}
.ecotrek-map .leaflet-shadow-pane{z-index:500}
.ecotrek-map .leaflet-marker-pane{z-index:600}
.ecotrek-map .leaflet-tooltip-pane{z-index:650}
.ecotrek-map .leaflet-popup-pane{z-index:700}
.ecotrek-map .leaflet-map-pane svg{max-width:none!important;max-height:none!important;overflow:visible}
.ecotrek-map .leaflet-tile-container img{max-width:none!important;max-height:none!important;padding:0}
.ecotrek-map .leaflet-container{overflow:hidden;outline-offset:2px;font:12px/1.5 system-ui,sans-serif;background:#e7eddf;touch-action:none;-webkit-tap-highlight-color:transparent}
.ecotrek-map .leaflet-grab{cursor:grab}
.ecotrek-map .leaflet-dragging .leaflet-grab{cursor:grabbing}
.ecotrek-map .leaflet-control{position:relative;z-index:800;pointer-events:auto;float:left;clear:both}
.ecotrek-map .leaflet-top,.ecotrek-map .leaflet-bottom{position:absolute;z-index:800;pointer-events:none}
.ecotrek-map .leaflet-top{top:0}.ecotrek-map .leaflet-right{right:0}.ecotrek-map .leaflet-bottom{bottom:0}.ecotrek-map .leaflet-left{left:0}
.ecotrek-map .leaflet-right .leaflet-control{float:right}
.ecotrek-map .leaflet-control-attribution{margin:0!important;padding:2px 7px;background:rgba(255,255,255,.9);color:#384e41;font-size:10px;line-height:17px}
.ecotrek-map .leaflet-control-attribution a{color:#28583e;text-decoration:underline}
.ecotrek-map .leaflet-zoom-hide{visibility:hidden}
.ecotrek-map .leaflet-interactive{cursor:pointer}
.ecotrek-map .leaflet-pane>svg path{pointer-events:none}
.ecotrek-map button:focus-visible,.ecotrek-map a:focus-visible{outline:3px solid #1a7a5a;outline-offset:2px}
`;

function valid(point: Coord | undefined): point is Coord {
  return !!point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}
const position = (point: Coord): L.LatLngTuple => [point.latitude, point.longitude];

/** Interactive Google Maps basemap. GPS recording is independent of tiles. */
export default function LiveMap({ path, current, height = 260, follow = true }: LiveMapProps) {
  const { colors, typography } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const pinRef = useRef<L.CircleMarker | null>(null);
  const startRef = useRef<L.CircleMarker | null>(null);
  const accuracyRef = useRef<L.Circle | null>(null);
  const followingRef = useRef(true);
  const latest = useRef({ path, current, follow });
  latest.current = { path, current, follow };
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading');

  useEffect(() => {
    if (!containerRef.current) return;
    let active = true;
    let loadedTiles = 0;
    let failedTiles = 0;
    let watchdog: ReturnType<typeof setTimeout>;
    let resizeObserver: ResizeObserver | undefined;
    let map: L.Map | undefined;
    setStatus('loading');
    followingRef.current = true;

    try {
      const points = latest.current.path.filter(valid);
      const center = valid(latest.current.current) ? position(latest.current.current)
        : points.length ? position(points[points.length - 1]) : AUSTIN;
      map = L.map(containerRef.current, {
        center, zoom: points.length || valid(latest.current.current) ? 16 : 12,
        zoomControl: false, attributionControl: true, preferCanvas: false,
        scrollWheelZoom: true, zoomAnimation: true,
      });
      mapRef.current = map;
      map.attributionControl.setPrefix(false);
      L.tileLayer(TILE_URL, {
        attribution: '© <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a>',
        maxZoom: 20,
        // Standard browser caching, a single tile host, and no prefetch/offline downloads.
        keepBuffer: 1,
      }).on('tileload', () => {
        if (!active) return;
        loadedTiles += 1;
        clearTimeout(watchdog);
        setStatus('ready');
      }).on('tileerror', () => {
        failedTiles += 1;
        if (active && loadedTiles === 0 && failedTiles >= 4) {
          clearTimeout(watchdog);
          setStatus('offline');
        }
      }).addTo(map);

      lineRef.current = L.polyline(points.map(position), {
        color: '#176143', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round',
      }).addTo(map);
      map.on('dragstart', () => { followingRef.current = false; });
      if (!latest.current.follow && points.length > 1) {
        map.fitBounds(L.latLngBounds(points.map(position)), { padding: [36, 36], maxZoom: 17 });
      }
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => map?.invalidateSize({ pan: false }));
        resizeObserver.observe(containerRef.current);
      }
      watchdog = setTimeout(() => {
        if (active && loadedTiles === 0) setStatus('offline');
      }, 8_000);
    } catch {
      setStatus('offline');
    }
    const retryWhenOnline = () => setAttempt((n) => n + 1);
    window.addEventListener('online', retryWhenOnline);

    return () => {
      active = false;
      clearTimeout(watchdog);
      resizeObserver?.disconnect();
      window.removeEventListener('online', retryWhenOnline);
      map?.remove();
      mapRef.current = null;
      lineRef.current = null;
      pinRef.current = null;
      startRef.current = null;
      accuracyRef.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points = path.filter(valid);
    lineRef.current?.setLatLngs(points.map(position));
    if (points.length) {
      if (!startRef.current) {
        startRef.current = L.circleMarker(position(points[0]), {
          radius: 6, color: '#fff', weight: 2, fillColor: '#D9953B', fillOpacity: 1,
        }).addTo(map);
      } else startRef.current.setLatLng(position(points[0]));
      if (!follow && points.length > 1) {
        map.fitBounds(L.latLngBounds(points.map(position)), { padding: [36, 36], maxZoom: 17, animate: false });
      }
    } else if (startRef.current) {
      startRef.current.remove();
      startRef.current = null;
    }
  }, [path, follow, attempt, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !valid(current)) return;
    const center = position(current);
    if (!pinRef.current) {
      pinRef.current = L.circleMarker(center, {
        radius: 8, color: '#FFFFFF', weight: 3, fillColor: '#2379D2', fillOpacity: 1,
      }).addTo(map);
    } else pinRef.current.setLatLng(center);
    pinRef.current.bringToFront();
    if (Number.isFinite(current.accuracy) && current.accuracy! > 0) {
      const radius = Math.min(5000, current.accuracy!);
      if (!accuracyRef.current) {
        accuracyRef.current = L.circle(center, { radius, color: '#2379D2', weight: 1, fillOpacity: 0.08, interactive: false }).addTo(map);
      } else accuracyRef.current.setLatLng(center).setRadius(radius);
    } else {
      accuracyRef.current?.remove();
      accuracyRef.current = null;
    }
    if (follow && followingRef.current) map.setView(center, Math.max(map.getZoom(), 16), { animate: false });
  }, [current, follow, attempt, status]);

  const recenter = () => {
    followingRef.current = true;
    const point = latest.current.current ?? latest.current.path[latest.current.path.length - 1];
    if (valid(point)) mapRef.current?.setView(position(point), 16, { animate: false });
    else if (path.filter(valid).length > 1) mapRef.current?.fitBounds(L.latLngBounds(path.filter(valid).map(position)));
  };

  return (
    <View testID="live-map" style={{ width: '100%', height, overflow: 'hidden', borderRadius: RADIUS.lg, backgroundColor: '#E7EDDF' }}>
      <style>{MAP_CSS}</style>
      <div className="ecotrek-map" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 0 }}>
        <div ref={containerRef} role="region" aria-label="Activity map" style={{ width: '100%', height: '100%' }} />
      </div>
      {status === 'ready' ? (
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" style={styles.control} onPress={() => mapRef.current?.zoomIn()}>
            <Icon name="plus" size={21} color="#254D39" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" style={styles.control} onPress={() => mapRef.current?.zoomOut()}>
            <Icon name="minus" size={21} color="#254D39" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Recenter on my location" style={[styles.control, { marginTop: 6 }]} onPress={recenter}>
            <Icon name="navigation" size={20} color="#176143" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open in Google Maps"
            style={[styles.control, styles.mapsButton]}
            onPress={() => {
              const point = valid(current) ? current : path.filter(valid)[path.filter(valid).length - 1];
              const url = point ? googleMapsViewUrl(point.latitude, point.longitude) : 'https://www.google.com/maps';
              Linking.openURL(url).catch(() => {});
            }}
          >
            <Text style={styles.mapsButtonText}>Google Maps</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceSunken }]}>
          <RouteSketch path={path} current={current} />
          <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {status === 'loading' ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="map" size={18} color={colors.primary} />}
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[typography.micro, { color: colors.text }]}>{status === 'loading' ? 'Loading map…' : 'Map tiles unavailable'}</Text>
              <Text style={[typography.micro, { fontWeight: '400', color: colors.textMuted }]}>
                {status === 'loading' ? 'Your recorded route stays visible.' : 'Route-only view. GPS can keep recording.'}
              </Text>
            </View>
            {status === 'offline' ? (
              <Pressable accessibilityRole="button" onPress={() => setAttempt((n) => n + 1)} style={styles.retry}>
                <Text style={[typography.micro, { color: colors.primary }]}>Retry map</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { zIndex: 2, position: 'absolute', right: 12, bottom: 28, gap: 2 },
  control: { width: 44, height: 44, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2, boxShadow: '0 2px 10px #18382918' },
  notice: { position: 'absolute', bottom: 12, left: 12, right: 12, padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1 },
  retry: { paddingHorizontal: 8, paddingVertical: 14 },
  mapsButton: { width: 76, marginTop: 6, paddingHorizontal: 6 },
  mapsButtonText: { fontSize: 11, fontWeight: '700', color: '#176143', textAlign: 'center' },
});
