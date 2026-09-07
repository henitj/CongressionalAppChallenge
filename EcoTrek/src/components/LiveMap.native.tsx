import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { Coord } from '../services/location';
import { RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import RouteSketch from './RouteSketch';

type Props = {
  path: Coord[];
  current?: Coord;
  height?: number;
  follow?: boolean;
};

type MapsModule = {
  default: any;
  Marker: any;
  Polyline: any;
  Circle: any;
  PROVIDER_GOOGLE: any;
};

let maps: MapsModule | null | undefined;

function loadMaps(): MapsModule | null {
  if (maps !== undefined) return maps;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    maps = require('react-native-maps') as MapsModule;
  } catch (e) {
    console.warn('[map] react-native-maps unavailable in this Expo runtime', e);
    maps = null;
  }
  return maps;
}

export default function LiveMap({ path, current, height = 260, follow = true }: Props) {
  const mapRef = useRef<any>(null);
  const { colors, typography } = useTheme();
  const Maps = loadMaps();

  useEffect(() => {
    if (!Maps || !follow || !current || !mapRef.current) return;
    try {
      mapRef.current.animateCamera(
        {
          center: { latitude: current.latitude, longitude: current.longitude },
          zoom: 17,
        },
        { duration: 600 }
      );
    } catch {
      /* camera APIs differ slightly across Expo Go versions */
    }
  }, [Maps, current, follow]);

  const shell = {
    width: '100%' as const,
    borderRadius: RADIUS.md,
    overflow: 'hidden' as const,
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.border,
    height,
  };

  if (!Maps?.default) {
    return (
      <View style={shell}>
        <RouteSketch path={path} current={current} />
        <View style={styles.note}>
          <Text style={[typography.micro, { color: colors.textMuted }]}>Recording without a live map</Text>
        </View>
      </View>
    );
  }

  const MapView = Maps.default;
  const { Marker, Polyline, Circle, PROVIDER_GOOGLE } = Maps;

  const initialRegion = {
    latitude: current?.latitude ?? path[0]?.latitude ?? 30.2672,
    longitude: current?.longitude ?? path[0]?.longitude ?? -97.7431,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <View style={shell}>
      <MapView
        ref={(r: any) => {
          mapRef.current = r;
        }}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        followsUserLocation={follow}
      >
        {path.length > 1 && Polyline ? (
          <Polyline
            coordinates={path.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor="#003D28"
            strokeWidth={8}
          />
        ) : null}
        {path.length > 0 && Marker ? (
          <Marker
            coordinate={{
              latitude: path[0].latitude,
              longitude: path[0].longitude,
            }}
            pinColor={colors.accent}
            title="Start"
          />
        ) : null}
        {current && Marker ? (
          <Marker
            coordinate={{ latitude: current.latitude, longitude: current.longitude }}
            title="You are here"
            pinColor="#FFD000"
            tracksViewChanges={false}
          />
        ) : null}
        {current && current.accuracy !== undefined && Circle ? (
          <Circle
            center={{ latitude: current.latitude, longitude: current.longitude }}
            radius={Math.max(current.accuracy, 12)}
            strokeColor="#003D28"
            fillColor="rgba(255,208,0,0.22)"
            strokeWidth={2}
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
