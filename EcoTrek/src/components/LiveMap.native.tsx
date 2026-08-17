import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Platform } from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Coord } from '../services/location';
import { COLORS, RADIUS } from '../constants/theme';

type Props = {
  path: Coord[];
  current?: Coord;
  height?: number;
  follow?: boolean;
};

export default function LiveMap({ path, current, height = 260, follow = true }: Props) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (follow && current && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: { latitude: current.latitude, longitude: current.longitude },
          zoom: 17,
        },
        { duration: 600 }
      );
    }
  }, [current, follow]);

  const initialRegion = {
    latitude: current?.latitude ?? path[0]?.latitude ?? 30.2672,
    longitude: current?.longitude ?? path[0]?.longitude ?? -97.7431,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
        style={StyleSheet.absoluteFillObject}
        // Android has no map without Google. iOS uses Apple Maps, which needs
        // no API key at all — forcing Google there would demand a second key
        // for no visible benefit.
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        followsUserLocation={follow}
      >
        {path.length > 1 && (
          <Polyline
            coordinates={path.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor={COLORS.primary}
            strokeWidth={5}
          />
        )}
        {path.length > 0 && (
          <Marker
            coordinate={{
              latitude: path[0].latitude,
              longitude: path[0].longitude,
            }}
            pinColor={COLORS.accent}
            title="Start"
          />
        )}
        {current && current.accuracy !== undefined && (
          <Circle
            center={{ latitude: current.latitude, longitude: current.longitude }}
            radius={current.accuracy}
            strokeColor="rgba(22,98,74,0.35)"
            fillColor="rgba(22,98,74,0.08)"
          />
        )}
      </MapView>
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
