import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Pill, Segmented, EmptyState, Sheet, Button, Banner, Divider } from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Trail } from '../constants/austinTrails';
import { useApp } from '../context/AppContext';
import { useSettings } from '../constants/SettingsContext';
import { useActivity } from '../context/ActivityContext';

type Filter = 'all' | 'hike' | 'bike' | 'easy' | 'family';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'hike', label: 'Hiking' },
  { value: 'bike', label: 'Biking' },
  { value: 'easy', label: 'Easy' },
  { value: 'family', label: 'Family' },
];

export default function TrailsScreen() {
  const navigation = useNavigation<any>();
  const { trails, trailsLoading, refreshTrails, permission, requestLocation, usingFallbackLocation } =
    useApp();
  const { formatDistance, formatDistanceUnit } = useSettings();
  const { history } = useActivity();

  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Trail | null>(null);

  const completedIds = useMemo(
    () => new Set(history.filter((a) => a.trailCompleted && a.trailId).map((a) => a.trailId!)),
    [history]
  );
  const visitedIds = useMemo(
    () => new Set(history.filter((a) => a.trailId).map((a) => a.trailId!)),
    [history]
  );

  const filtered = useMemo(() => {
    return trails.filter((t) => {
      switch (filter) {
        case 'hike':
          return t.type === 'hike' || t.type === 'mixed';
        case 'bike':
          return t.type === 'bike' || t.type === 'mixed';
        case 'easy':
          return t.difficulty === 'Easy';
        case 'family':
          return !!t.familyFriendly;
        default:
          return true;
      }
    });
  }, [trails, filter]);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={trailsLoading} onRefresh={refreshTrails} tintColor={COLORS.textMuted} />
      }
    >
      <Header
        title="Trails"
        subtitle={`${filtered.length} near you`}
        actions={[{ icon: 'shield', onPress: () => navigation.navigate('Safety'), label: 'Safety' }]}
      />

      <View style={styles.body}>
        {usingFallbackLocation && permission !== 'granted' ? (
          <Banner
            tone="neutral"
            icon="map-pin"
            title="Sorted for central Austin"
            message="Turn on location to sort trails by how close they are to you."
            right={
              <Pressable onPress={() => requestLocation()} hitSlop={8}>
                <Text style={styles.bannerAction}>Enable</Text>
              </Pressable>
            }
          />
        ) : null}

        {/* Filters */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <Pressable
                key={f.value}
                onPress={() => setFilter(f.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {filtered.length === 0 ? (
          <EmptyState icon="map" title="No trails match" message="Try a different filter." />
        ) : (
          <View style={{ gap: SPACING.sm }}>
            {filtered.map((t) => (
              <TrailCard
                key={t.id}
                trail={t}
                completed={completedIds.has(t.id)}
                visited={visitedIds.has(t.id)}
                onPress={() => setSelected(t)}
                formatDistance={formatDistance}
                unit={formatDistanceUnit()}
              />
            ))}
          </View>
        )}
      </View>

      {/* Detail sheet */}
      <Sheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={selected ? `${selected.area} · ${selected.difficulty}` : undefined}
      >
        {selected ? (
          <View style={{ gap: SPACING.md }}>
            <View style={styles.detailStats}>
              <DetailStat
                icon="activity"
                value={`${formatDistance(selected.distanceMiles)} ${formatDistanceUnit()}`}
                label="Length"
              />
              <DetailStat
                icon="clock"
                value={selected.estimatedMinutes ? `${Math.round(selected.estimatedMinutes / 60 * 10) / 10}h` : '—'}
                label="Typical"
              />
              <DetailStat
                icon="mountain"
                value={selected.elevationGainFt ? `${selected.elevationGainFt} ft` : '—'}
                label="Climb"
              />
              <DetailStat icon="star" value={selected.rating ? String(selected.rating) : '—'} label="Rating" />
            </View>

            <Text style={styles.detailDescription}>{selected.description}</Text>

            <View style={styles.amenities}>
              {selected.petFriendly ? <Pill label="Dogs allowed" tone="neutral" size="sm" /> : null}
              {selected.familyFriendly ? <Pill label="Family friendly" tone="neutral" size="sm" /> : null}
              {selected.strollerFriendly ? <Pill label="Stroller OK" tone="neutral" size="sm" /> : null}
              {selected.restroomsAvailable ? <Pill label="Restrooms" tone="neutral" size="sm" /> : null}
              {selected.waterStations ? <Pill label="Water" tone="neutral" size="sm" /> : null}
              {selected.isLoop ? <Pill label="Loop" tone="neutral" size="sm" /> : null}
            </View>

            {selected.safetyTips.length > 0 ? (
              <View>
                <Text style={styles.detailSection}>Before you go</Text>
                {selected.safetyTips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Icon name="alert-circle" size={14} color={COLORS.warning} strokeWidth={2} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {(selected.plants?.length || selected.animals?.length) ? (
              <View>
                <Text style={styles.detailSection}>What lives here</Text>
                <View style={styles.amenities}>
                  {selected.plants?.map((p) => <Pill key={p} label={p} tone="primary" size="sm" icon="leaf" />)}
                  {selected.animals?.map((a) => <Pill key={a} label={a} tone="neutral" size="sm" icon="eye" />)}
                </View>
              </View>
            ) : null}

            <Divider />

            <View style={{ gap: SPACING.sm }}>
              <Button
                label="Track an activity here"
                icon="play"
                full
                onPress={() => {
                  setSelected(null);
                  navigation.navigate('Track');
                }}
              />
              <Button
                label="Open in maps"
                variant="secondary"
                icon="navigation"
                full
                onPress={() => {
                  const q = `${selected.startLat},${selected.startLng}`;
                  Linking.openURL(`https://maps.google.com/?q=${q}`);
                }}
              />
            </View>

            <Text style={styles.detectionNote}>
              Start your activity within about a third of a mile of the trailhead and EcoTrek will
              recognise the trail automatically. Cover 70% of its length to log a completion.
            </Text>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function TrailCard({
  trail,
  completed,
  visited,
  onPress,
  formatDistance,
  unit,
}: {
  trail: Trail;
  completed: boolean;
  visited: boolean;
  onPress: () => void;
  formatDistance: (m: number) => string;
  unit: string;
}) {
  const difficultyTone =
    trail.difficulty === 'Easy' ? 'primary' : trail.difficulty === 'Moderate' ? 'warning' : 'danger';

  return (
    <Card onPress={onPress}>
      <View style={styles.trailHead}>
        <View style={styles.trailIcon}>
          <Icon
            name={trail.type === 'bike' ? 'bike' : trail.type === 'hike' ? 'boot' : 'route'}
            size={18}
            color={COLORS.primary}
            strokeWidth={1.9}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.trailTitleRow}>
            <Text style={styles.trailName} numberOfLines={1}>
              {trail.name}
            </Text>
            {completed ? <Icon name="check-circle" size={15} color={COLORS.primary} strokeWidth={2.1} /> : null}
          </View>
          <Text style={styles.trailArea}>
            {trail.area}
            {trail.distanceFromUserMi != null
              ? ` · ${trail.distanceFromUserMi.toFixed(1)} mi away`
              : ''}
          </Text>
        </View>
        <Icon name="chevron-right" size={17} color={COLORS.textLight} />
      </View>

      <Text style={styles.trailDesc} numberOfLines={2}>
        {trail.description}
      </Text>

      <View style={styles.trailTags}>
        <Pill label={`${formatDistance(trail.distanceMiles)} ${unit}`} tone="neutral" size="sm" icon="activity" />
        <Pill label={trail.difficulty} tone={difficultyTone as any} size="sm" />
        {trail.rating ? <Pill label={`${trail.rating}`} tone="neutral" size="sm" icon="star" /> : null}
        {completed ? (
          <Pill label="Completed" tone="primary" size="sm" icon="flag" />
        ) : visited ? (
          <Pill label="Visited" tone="neutral" size="sm" />
        ) : null}
      </View>
    </Card>
  );
}

function DetailStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Icon name={icon} size={15} color={COLORS.textMuted} strokeWidth={1.9} />
      <Text style={styles.detailStatValue}>{value}</Text>
      <Text style={styles.detailStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  bannerAction: { ...TYPOGRAPHY.smallMed, color: COLORS.primary },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { ...TYPOGRAPHY.smallMed, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff' },

  trailHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  trailIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trailName: { ...TYPOGRAPHY.h4, color: COLORS.text, flexShrink: 1 },
  trailArea: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  trailDesc: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: SPACING.sm + 2 },
  trailTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm + 2 },

  detailStats: { flexDirection: 'row' },
  detailStatValue: { ...TYPOGRAPHY.h4, color: COLORS.text },
  detailStatLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },
  detailDescription: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  detailSection: { ...TYPOGRAPHY.overline, color: COLORS.textMuted, marginBottom: SPACING.sm },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tipRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 7, alignItems: 'flex-start' },
  tipText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, flex: 1 },
  detectionNote: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
});
