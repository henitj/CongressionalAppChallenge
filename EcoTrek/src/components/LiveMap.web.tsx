import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Icon from './Icon';
import RouteSketch from './RouteSketch';
import { Coord } from '../services/location';
import { RADIUS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type LatLng = { lat: number; lng: number };
type GoogleMap = {
  panTo: (position: LatLng) => void;
  fitBounds: (bounds: unknown) => void;
};
type GoogleOverlay = {
  setMap: (map: GoogleMap | null) => void;
};
type GooglePolyline = GoogleOverlay & {
  setPath: (path: LatLng[]) => void;
};
type GoogleMarker = GoogleOverlay & {
  setPosition: (position: LatLng) => void;
};
type GoogleCircle = GoogleOverlay & {
  setCenter: (position: LatLng) => void;
  setRadius: (radius: number) => void;
};
type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
  Polyline: new (options: Record<string, unknown>) => GooglePolyline;
  Marker: new (options: Record<string, unknown>) => GoogleMarker;
  Circle: new (options: Record<string, unknown>) => GoogleCircle;
  event?: { clearInstanceListeners: (instance: unknown) => void };
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
  }
}

type Props = {
  path: Coord[];
  current?: Coord;
  height?: number;
  follow?: boolean;
};

const AUSTIN: LatLng = { lat: 30.2672, lng: -97.7431 };
let mapsPromise: Promise<GoogleMapsApi> | null = null;

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!apiKey) return Promise.reject(new Error('Google Maps API key is not configured'));
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const scriptId = 'ecotrek-google-maps-js';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    let timeout: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timeout);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
    const onLoad = () => {
      cleanup();
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps loaded without its JavaScript API'));
    };
    const onError = () => {
      cleanup();
      reject(new Error('Google Maps could not be loaded'));
    };

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Google Maps took too long to load'));
    }, 12_000);

    if (!existing) {
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
      document.head.appendChild(script);
    } else if (window.google?.maps) {
      onLoad();
    }
  }).catch((error) => {
    mapsPromise = null;
    throw error;
  });

  return mapsPromise;
}

/** Google Maps on web; the recorded route remains visible if Maps is offline or unconfigured. */
export default function LiveMap({ path, current, height = 260, follow = true }: Props) {
  const { colors, typography } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const polylineRef = useRef<GooglePolyline | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const startMarkerRef = useRef<GoogleMarker | null>(null);
  const accuracyCircleRef = useRef<GoogleCircle | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let active = true;
    let map: GoogleMap | null = null;
    const initial = current
      ? { lat: current.latitude, lng: current.longitude }
      : path[0]
        ? { lat: path[0].latitude, lng: path[0].longitude }
        : AUSTIN;

    if (!apiKey) {
      setStatus('unavailable');
      return () => {
        active = false;
      };
    }

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (!active || !containerRef.current) return;
        map = new google.Map(containerRef.current, {
          center: initial,
          zoom: 16,
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });
        mapRef.current = map;
        polylineRef.current = new google.Polyline({
          map,
          path: [],
          geodesic: true,
          strokeColor: colors.primaryDark,
          strokeOpacity: 0.95,
          strokeWeight: 6,
        });
        markerRef.current = new google.Marker({
          map,
          position: initial,
          title: 'You are here',
          zIndex: 3,
          icon: {
            path: 'CIRCLE',
            scale: 8,
            fillColor: '#FFD000',
            fillOpacity: 1,
            strokeColor: colors.primaryDark,
            strokeWeight: 3,
          },
        });
        setStatus('ready');
      })
      .catch((error) => {
        if (active) {
          console.warn('[map] Google Maps unavailable; drawing route fallback.', error);
          setStatus('unavailable');
        }
      });

    return () => {
      active = false;
      if (map) window.google?.maps?.event?.clearInstanceListeners(map);
      [polylineRef.current, markerRef.current, startMarkerRef.current, accuracyCircleRef.current].forEach(
        (overlay) => {
          if (overlay) {
            window.google?.maps?.event?.clearInstanceListeners(overlay);
            overlay.setMap(null);
          }
        }
      );
      mapRef.current = null;
      polylineRef.current = null;
      markerRef.current = null;
      startMarkerRef.current = null;
      accuracyCircleRef.current = null;
    };
    // A map is created once per screen mount. Current/path changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, colors.primaryDark]);

  useEffect(() => {
    const google = window.google?.maps;
    const map = mapRef.current;
    const polyline = polylineRef.current;
    if (status !== 'ready' || !google || !map || !polyline) return;

    const points = path.map((point) => ({ lat: point.latitude, lng: point.longitude }));
    polyline.setPath(points);
    if (points.length > 0) {
      if (!startMarkerRef.current) {
        startMarkerRef.current = new google.Marker({
          map,
          position: points[0],
          title: 'Start',
          zIndex: 2,
          icon: {
            path: 'CIRCLE',
            scale: 6,
            fillColor: colors.accent,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });
      } else {
        startMarkerRef.current.setPosition(points[0]);
      }
    } else if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
      startMarkerRef.current = null;
    }
  }, [path, status, colors.accent]);

  useEffect(() => {
    const google = window.google?.maps;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (status !== 'ready' || !google || !map || !marker || !current) return;

    const position = { lat: current.latitude, lng: current.longitude };
    marker.setPosition(position);
    if (current.accuracy !== undefined) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setCenter(position);
        accuracyCircleRef.current.setRadius(current.accuracy);
      } else {
        accuracyCircleRef.current = new google.Circle({
          map,
          center: position,
          radius: current.accuracy,
          fillColor: colors.primary,
          fillOpacity: 0.08,
          strokeColor: colors.primary,
          strokeOpacity: 0.4,
          strokeWeight: 1,
          clickable: false,
        });
      }
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
      accuracyCircleRef.current = null;
    }
    if (follow) map.panTo(position);
  }, [current, follow, status, colors.primary]);

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

  const fallbackMessage = apiKey
    ? 'Google Maps unavailable — route is still shown'
    : 'Google Maps key not configured — route is still shown';

  return (
    <View style={shellStyle}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#DCE6DF' }} />
      {status !== 'ready' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceSunken }]}>
          {status === 'unavailable' ? (
            <>
              <RouteSketch path={path} current={current} />
              <View style={[styles.note, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Icon name="map" size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={[typography.micro, { color: colors.textMuted }]}>{fallbackMessage}</Text>
              </View>
            </>
          ) : (
            <View style={styles.center}>
              <Icon name="map" size={22} color={colors.textLight} strokeWidth={1.8} />
              <Text style={[typography.small, { color: colors.textMuted }]}>Loading Google Maps…</Text>
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
    maxWidth: '94%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
});
