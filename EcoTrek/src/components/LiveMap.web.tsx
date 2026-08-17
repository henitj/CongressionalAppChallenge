import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Coord } from '../services/location';
import { COLORS, RADIUS } from '../constants/theme';

type Props = {
  path: Coord[];
  current?: Coord;
  height?: number;
  follow?: boolean;
};

/**
 * Web implementation – real OpenStreetMap tiles via Leaflet (loaded from CDN).
 * No bundler config needed; we inject the script/css once and talk to the
 * global window.L object.
 */

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in a browser'));
      return;
    }
    if ((window as any).L) {
      resolve((window as any).L);
      return;
    }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error('Failed to load Leaflet'));
    document.head.appendChild(script);
  });
}

export default function LiveMap({ path, current, height = 260, follow = true }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);

  // Initial map setup
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const initial = current
          ? [current.latitude, current.longitude]
          : path[0]
          ? [path[0].latitude, path[0].longitude]
          : [30.2672, -97.7431]; // Austin

        const map = L.map(containerRef.current, {
          center: initial,
          zoom: 16,
          zoomControl: true,
          attributionControl: true,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        polylineRef.current = L.polyline([], {
          color: COLORS.primary,
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        // Pulsing "you are here" marker using a divIcon
        const youIcon = L.divIcon({
          className: 'ecotrek-you-icon',
          html: `
            <div style="position:relative;width:22px;height:22px;">
              <div style="position:absolute;inset:0;border-radius:50%;background:${COLORS.primary};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
              <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(22,98,74,0.25);animation:ecotrek-pulse 1.6s ease-out infinite;"></div>
            </div>
            <style>
              @keyframes ecotrek-pulse {
                0%{transform:scale(0.6);opacity:0.8;}
                100%{transform:scale(1.6);opacity:0;}
              }
            </style>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        markerRef.current = L.marker(initial, { icon: youIcon }).addTo(map);

        mapRef.current = map;

        // Force a resize after mount in case container size finalized later
        setTimeout(() => map.invalidateSize(), 100);
      })
      .catch((e) => console.warn('[map] Leaflet failed to load', e));

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update polyline as the path grows
  useEffect(() => {
    if (!mapRef.current || !polylineRef.current) return;
    const L = (window as any).L;
    const latlngs = path.map((p) => [p.latitude, p.longitude]);
    polylineRef.current.setLatLngs(latlngs);

    if (path.length > 0 && !startMarkerRef.current) {
      const startIcon = L.divIcon({
        className: 'ecotrek-start-icon',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#F4A300;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      startMarkerRef.current = L.marker(
        [path[0].latitude, path[0].longitude],
        { icon: startIcon }
      ).addTo(mapRef.current);
    }
  }, [path]);

  // Update current position marker + follow
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !current) return;
    const L = (window as any).L;
    const ll = [current.latitude, current.longitude];
    markerRef.current.setLatLng(ll);

    // accuracy circle
    if (current.accuracy !== undefined) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(ll);
        accuracyCircleRef.current.setRadius(current.accuracy);
      } else {
        accuracyCircleRef.current = L.circle(ll, {
          radius: current.accuracy,
          color: COLORS.primary,
          fillColor: COLORS.primary,
          fillOpacity: 0.08,
          weight: 1,
          opacity: 0.4,
        }).addTo(mapRef.current);
      }
    }

    if (follow) {
      mapRef.current.panTo(ll, { animate: true, duration: 0.5 });
    }
  }, [current, follow]);

  return (
    <View style={[styles.wrap, { height }]}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
