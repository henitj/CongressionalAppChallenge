import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Trail } from '../constants/austinTrails';
import { useTheme } from '../context/ThemeContext';
import { getTrailCover, getTrailPhotos, TrailPhotoSet } from '../services/trailPhotos';
import TrailScene from './TrailScene';

type TrailPhotoProps = { trail: Trail };

/** A real Wikimedia/admin-approved cover with an illustrated offline fallback. */
export function TrailCover({ trail, loadRemote = true }: TrailPhotoProps & { loadRemote?: boolean }) {
  const { colors, typography } = useTheme();
  const [uri, setUri] = useState<string | null>(trail.imageUrl ?? null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setLoaded(false);
    setUri(trail.imageUrl ?? null);
    if (!loadRemote) return () => { active = false; };
    getTrailCover(trail)
      .then((cover) => {
        if (active) setUri(cover);
      })
      .catch(() => {
        if (active) setUri(null);
      });
    return () => {
      active = false;
    };
  }, [trail.id, trail.imageUrl, loadRemote]);

  const showImage = Boolean(uri && !failed);
  const photoReady = showImage && loaded;
  return (
    <View style={styles.cover}>
      {!photoReady ? <TrailScene mode={trail.type === 'bike' ? 'bike' : 'hike'} style={{ height: 132, minHeight: 0, flexGrow: 0, flexShrink: 0 }} /> : null}
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          style={[StyleSheet.absoluteFill, { opacity: photoReady ? 1 : 0 }]}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          accessibilityLabel={`${trail.name} trail photo`}
        />
      ) : null}
      {!photoReady ? (
        <View style={[styles.coverFallbackLabel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.micro, { color: colors.textMuted }]}>Trail illustration</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Horizontal detail gallery; if the photo source is offline, show a clear local illustration. */
export function TrailPhotoGallery({ trail }: TrailPhotoProps) {
  const { colors, typography } = useTheme();
  const [photos, setPhotos] = useState<TrailPhotoSet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setPhotos(null);
    setLoading(true);
    getTrailPhotos(trail).then((result) => {
      if (!active) return;
      setPhotos(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [trail.id]);

  const items = photos?.all ?? [];
  if (items.length === 0) {
    return (
      <View style={styles.gallerySection}>
        <Text style={[typography.overline, { color: colors.textMuted }]}>Trail illustration</Text>
        <View style={[styles.galleryFallback, { backgroundColor: colors.primarySurface }]}>
          <TrailScene
            mode={trail.type === 'bike' ? 'bike' : 'hike'}
            style={{ height: 168, minHeight: 0, flexGrow: 0, flexShrink: 0 }}
          />
        </View>
        <Text style={[typography.micro, { color: colors.textLight }]}>
          {loading ? 'Loading trail photos…' : 'Photos are unavailable offline; this illustration is a preview.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.gallerySection}>
      <Text style={[typography.overline, { color: colors.textMuted }]}>Trail photos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
        {items.slice(0, 10).map((photo, index) => (
          <GalleryImage
            key={`${photo.url}-${index}`}
            uri={photo.thumbUrl || photo.url}
            title={photo.title}
            colors={colors}
            typography={typography}
          />
        ))}
      </ScrollView>
      <Text style={[typography.micro, { color: colors.textLight }]}>
        Community photos via Wikimedia Commons; view the trail conditions before you go.
      </Text>
    </View>
  );
}

function GalleryImage({
  uri,
  title,
  colors,
  typography,
}: {
  uri: string;
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.galleryTile, { backgroundColor: colors.primarySurface }]}>
      {failed ? (
        <View style={styles.photoUnavailable}>
          <Text style={[typography.micro, { color: colors.textMuted }]}>Photo unavailable</Text>
        </View>
      ) : (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />
      )}
      <View style={[styles.photoCaption, { backgroundColor: colors.surface }]}>
        <Text style={[typography.micro, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 132,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#DCE6DF',
  },
  coverFallbackLabel: {
    position: 'absolute',
    left: 9,
    bottom: 9,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 999,
  },
  gallerySection: { gap: 8 },
  galleryRow: { gap: 10, paddingRight: 8 },
  galleryTile: { width: 224, height: 150, borderRadius: 14, overflow: 'hidden' },
  photoCaption: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 8,
    opacity: 0.92,
  },
  photoUnavailable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  galleryFallback: { width: '100%', height: 168, borderRadius: 14, overflow: 'hidden' },
});
