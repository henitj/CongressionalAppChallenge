import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import Icon from './Icon';
import RouteSketch from './RouteSketch';
import { Coord } from '../services/location';
import { RADIUS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  path: Coord[];
  current?: Coord;
  height?: number;
  follow?: boolean;
};

const AUSTIN: [number, number] = [30.2672, -97.7431];

/**
 * Web implementation — real OpenStreetMap tiles through Leaflet.
 *
 * Leaflet (and its stylesheet) is bundled with the app rather than pulled from
 * a CDN at runtime: a CDN <script> tag is the single most common reason this
 * map used to come up blank — one blocked request and there is no map at all,
 * and the stylesheet arriving after the script left tiles stacked in a corner.
 *
 * If map tiles themselves cannot be reached (no connection, blocked network),
 * we do not show an empty grey box either — RouteSketch draws the recorded
 * route so the screen still tells you something true.
 */
export default function LiveMap({ path, current, height = 260, follow = true }: Props) {
  const { colors, typography } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const tileErrorsRef = useRef(0);

  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  // ── Create the map once ────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let map: L.Map;
    try {
      const initial: [number, number] = current
        ? [current.latitude, current.longitude]
        : path[0]
        ? [path[0].latitude, path[0].longitude]
        : AUSTIN;

      map = L.map(el, {
        center: initial,
        zoom: 16,
        zoomControl: true,
        attributionControl: true,
      });

      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
        crossOrigin: true,
      });

      tiles.on('load', () => {
        tileErrorsRef.current = 0;
        setStatus('ready');
      });
      tiles.on('tileload', () => {
        tileErrorsRef.current = 0;
        setStatus('ready');
      });
      // A handful of failures in a row means the tile server is unreachable.
      tiles.on('tileerror', () => {
        tileErrorsRef.current += 1;
        if (tileErrorsRef.current >= 3) setStatus('unavailable');
      });
      tiles.addTo(map);

      polylineRef.current = L.polyline([], {
        color: '#003D28',
        weight: 7,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      const youIcon = L.divIcon({
        className: 'ecotrek-you-icon',
        html:
          '<div style="width:22px;height:22px;border-radius:50%;background:#FFD000;' +
          'border:4px solid #10281F;box-shadow:0 2px 8px rgba(0,0,0,0.45);"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      markerRef.current = L.marker(initial, { icon: youIcon, keyboard: false }).addTo(map);

      mapRef.current = map;

      // The panel around the map animates in, so the container is often still
      // the wrong size on the first frame. Re-measure once it settles, and
      // again whenever it actually changes size.
      const invalidate = () => map.invalidateSize();
      const t1 = setTimeout(invalidate, 60);
      const t2 = setTimeout(invalidate, 400);
      // If not a single tile has arrived after ten seconds, stop showing a
      // spinner forever and draw the route instead.
      const t3 = setTimeout(
        () => setStatus((prev) => (prev === 'loading' ? 'unavailable' : prev)),
        10_000
      );

      let observer: ResizeObserver | undefined;
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(invalidate);
        observer.observe(el);
      }
      window.addEventListener('resize', invalidate);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        observer?.disconnect();
        window.removeEventListener('resize', invalidate);
        map.remove();
        mapRef.current = null;
        polylineRef.current = null;
        markerRef.current = null;
        startMarkerRef.current = null;
        accuracyCircleRef.current = null;
      };
    } catch (e) {
      console.warn('[map] could not start Leaflet', e);
      setStatus('unavailable');
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Route line + start pin ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !polylineRef.current) return;
    polylineRef.current.setLatLngs(path.map((p) => [p.latitude, p.longitude] as [number, number]));

    if (path.length > 0 && !startMarkerRef.current) {
      const startIcon = L.divIcon({
        className: 'ecotrek-start-icon',
        html:
          '<div style="width:14px;height:14px;border-radius:50%;background:#F4A300;' +
          'border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      startMarkerRef.current = L.marker([path[0].latitude, path[0].longitude], {
        icon: startIcon,
        keyboard: false,
      }).addTo(map);
    }
  }, [path]);

  // ── Follow the walker ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markerRef.current || !current) return;
    const ll: [number, number] = [current.latitude, current.longitude];
    markerRef.current.setLatLng(ll);

    if (current.accuracy !== undefined) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(ll);
        accuracyCircleRef.current.setRadius(current.accuracy);
      } else {
        accuracyCircleRef.current = L.circle(ll, {
          radius: current.accuracy,
          color: colors.primary,
          fillColor: colors.primary,
          fillOpacity: 0.08,
          weight: 1,
          opacity: 0.4,
        }).addTo(map);
      }
    }

    if (follow) map.panTo(ll, { animate: true, duration: 0.5 });
  }, [current, follow, colors.primary]);

  const shellStyle = useMemo(
    () => ({
      width: '100%' as const,
      height,
      borderRadius: RADIUS.md,
      overflow: 'hidden' as const,
      backgroundColor: colors.backgroundDark,
      borderWidth: 1,
      borderColor: colors.border,
    }),
    [colors.backgroundDark, colors.border, height]
  );

  return (
    <View style={shellStyle}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#DCE6DF' }} />

      {status !== 'ready' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceSunken }]}>
          {status === 'unavailable' ? (
            <>
              <RouteSketch path={path} current={current} />
              <View style={[styles.note, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Icon name="globe" size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={[typography.micro, { color: colors.textMuted }]}>
                  Map images unavailable — still recording
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.center}>
              <Icon name="map" size={22} color={colors.textLight} strokeWidth={1.8} />
              <Text style={[typography.small, { color: colors.textMuted }]}>Loading the map…</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  note: {
    position: 'absolute',
    left: SPACING.sm,
    bottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
});
