import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, Linking, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Pill, EmptyState, Sheet, Button, Banner, Divider } from '../components/ui';

import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { Trail } from '../constants/austinTrails';
import { useApp } from '../context/AppContext';
import { useSettings } from '../constants/SettingsContext';
import { useActivity } from '../context/ActivityContext';
import { useResponsive } from '../hooks/useResponsive';
import { useResetOnLeave } from '../hooks/useResetOnLeave';
import { useTheme, Typography } from '../context/ThemeContext';

type SortKey = 'nearest' | 'shortest' | 'longest' | 'easiest' | 'rating';

const FILTERS: { value: string; label: string; icon: IconName }[] = [
  { value: 'all', label: 'All', icon: 'map' },
  { value: 'hike', label: 'Hiking', icon: 'boot' },
  { value: 'bike', label: 'Biking', icon: 'bike' },
  { value: 'easy', label: 'Easy', icon: 'check-circle' },
  { value: 'dogs', label: 'Dogs', icon: 'leaf' },
  { value: 'family', label: 'Family', icon: 'users' },
  { value: 'water', label: 'Water', icon: 'droplet' },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'shortest', label: 'Shortest' },
  { value: 'longest', label: 'Longest' },
  { value: 'easiest', label: 'Easiest' },
  { value: 'rating', label: 'Top rated' },
];

const DIFFICULTY_ORDER = { Easy: 0, Moderate: 1, Hard: 2 } as const;

export default function TrailsScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    trails,
    trailsLoading,
    refreshTrails,
    permission,
    requestLocation,
    usingFallbackLocation,
    trailsRegion,
    trailsSource,
  } = useApp();
  const { formatDistanceCompact, formatDistanceUnit } = useSettings();
  const { history } = useActivity();
  const { isTablet } = useResponsive();

  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('nearest');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Trail | null>(null);
  const [showSort, setShowSort] = useState(false);

  useResetOnLeave(
    useCallback(() => {
      setFilter('all');
      setSort('nearest');
      setQuery('');
      setSelected(null);
      setShowSort(false);
    }, [])
  );

  // The assistant can deep-link straight to a trail.
  useEffect(() => {
    const id = route.params?.focusTrailId;
    if (!id) return;
    const match = trails.find((t) => t.id === id);
    if (match) setSelected(match);
    navigation.setParams({ focusTrailId: undefined });
  }, [route.params?.focusTrailId, trails, navigation]);

  const completedIds = useMemo(
    () => new Set(history.filter((a) => a.trailCompleted && a.trailId).map((a) => a.trailId!)),
    [history]
  );
  const visitedIds = useMemo(
    () => new Set(history.filter((a) => a.trailId).map((a) => a.trailId!)),
    [history]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matches = trails.filter((t) => {
      if (q && !`${t.name} ${t.area} ${t.description}`.toLowerCase().includes(q)) return false;
      switch (filter) {
        case 'hike':
          return t.type === 'hike' || t.type === 'mixed';
        case 'bike':
          return t.type === 'bike' || t.type === 'mixed';
        case 'easy':
          return t.difficulty === 'Easy';
        case 'dogs':
          return !!t.petFriendly;
        case 'family':
          return !!t.familyFriendly;
        case 'water':
          return !!t.waterStations;
        default:
          return true;
      }
    });

    const sorted = [...matches];
    switch (sort) {
      case 'shortest':
        sorted.sort((a, b) => a.distanceMiles - b.distanceMiles);
        break;
      case 'longest':
        sorted.sort((a, b) => b.distanceMiles - a.distanceMiles);
        break;
      case 'easiest':
        sorted.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      default:
        sorted.sort(
          (a, b) => (a.distanceFromUserMi ?? Infinity) - (b.distanceFromUserMi ?? Infinity)
        );
    }
    return sorted;
  }, [trails, filter, sort, query]);

  const completedCount = completedIds.size;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={trailsLoading} onRefresh={refreshTrails} tintColor={colors.textMuted} />
      }
    >
      <Header
        title="Trails"
        subtitle={
          trailsRegion
            ? `${trailsRegion} · ${completedCount} of ${trails.length} completed`
            : `${completedCount} of ${trails.length} completed`
        }
        back
        actions={[{ icon: 'shield', onPress: () => navigation.navigate('Safety'), label: 'Safety' }]}
      />

      <View style={styles.body}>
        {/* Ask the assistant */}
        <Pressable
          onPress={() => navigation.navigate('Assistant', {})}
          style={({ pressed }) => [styles.askBar, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.askIcon}>
            <Icon name="help-circle" size={17} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.askTitle}>Ask about a trail</Text>
            <Text style={styles.askSub}>Dogs, water, difficulty, what to expect today</Text>
          </View>
          <Icon name="chevron-right" size={17} color={colors.textLight} />
        </Pressable>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Icon name="search" size={16} color={colors.textLight} strokeWidth={2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search trails"
              placeholderTextColor={colors.textLight}
              style={styles.searchInput}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Icon name="x" size={15} color={colors.textLight} strokeWidth={2.2} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={() => setShowSort(true)} style={styles.sortBtn}>
            <Icon name="filter" size={16} color={colors.textSecondary} strokeWidth={1.9} />
          </Pressable>
        </View>

        {usingFallbackLocation && permission !== 'granted' ? (
          <Banner
            tone="neutral"
            icon="map-pin"
            title="See trails near you"
            message="Turn on location and we will look up walks and rides around you in the US, Canada, and Mexico."
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
                <Icon
                  name={f.icon}
                  size={13}
                  color={active ? '#fff' : colors.textMuted}
                  strokeWidth={2}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultCount}>
            {filtered.length} trail{filtered.length === 1 ? '' : 's'}
          </Text>
          <Pressable onPress={() => setShowSort(true)} hitSlop={8} style={styles.sortLabel}>
            <Text style={styles.sortLabelText}>
              {SORTS.find((s) => s.value === sort)?.label}
            </Text>
            <Icon name="chevron-down" size={13} color={colors.primary} strokeWidth={2.2} />
          </Pressable>
        </View>

        {trails.length === 0 && !trailsLoading ? (
          <EmptyState
            icon="map-pin"
            title={usingFallbackLocation ? 'See trails near you' : 'No trails nearby'}
            message={
              usingFallbackLocation
                ? 'Turn on location and we will look up walks and rides around you.'
                : 'We could not find named trails in this area. Pull to refresh, or try again in a moment.'
            }
            action={usingFallbackLocation ? 'Enable location' : 'Try again'}
            onAction={() => (usingFallbackLocation ? requestLocation() : refreshTrails())}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="map"
            title="No trails match"
            message="Try a different filter or clear the search."
            action="Reset"
            onAction={() => {
              setFilter('all');
              setQuery('');
            }}
          />
        ) : (
          <View style={[styles.grid, isTablet && styles.gridTablet]}>
            {filtered.map((t) => (
              <View key={t.id} style={isTablet ? styles.gridHalf : styles.gridFull}>
                <TrailCard
                  trail={t}
                  completed={completedIds.has(t.id)}
                  visited={visitedIds.has(t.id)}
                  showDistance={!usingFallbackLocation}
                  onPress={() => setSelected(t)}
                  formatDistance={formatDistanceCompact}
                  unit={formatDistanceUnit()}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Sort sheet ────────────────────────────────────────────────────── */}
      <Sheet visible={showSort} onClose={() => setShowSort(false)} title="Sort by">
        <View style={{ gap: SPACING.xs }}>
          {SORTS.map((s) => (
            <Pressable
              key={s.value}
              onPress={() => {
                setSort(s.value);
                setShowSort(false);
              }}
              style={styles.sortOption}
            >
              <Text style={[styles.sortOptionText, sort === s.value && { color: colors.primary }]}>
                {s.label}
              </Text>
              {sort === s.value ? (
                <Icon name="check" size={17} color={colors.primary} strokeWidth={2.4} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Sheet>

      {/* ── Trail detail ──────────────────────────────────────────────────── */}
      <Sheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={selected ? `${selected.area} · ${selected.difficulty}` : undefined}
      >
        {selected ? (
          <View style={{ gap: SPACING.md }}>
            {completedIds.has(selected.id) ? (
              <Banner
                tone="success"
                icon="check-circle"
                title="You have completed this trail"
                message="It counts toward your Trail Master badge."
              />
            ) : null}

            <View style={styles.detailStats}>
              <DetailStat
                icon="activity"
                value={`${formatDistanceCompact(selected.distanceMiles)} ${formatDistanceUnit()}`}
                label="Length"
              />
              <DetailStat
                icon="clock"
                value={
                  selected.estimatedMinutes
                    ? `${Math.round((selected.estimatedMinutes / 60) * 10) / 10}h`
                    : '—'
                }
                label="Typical"
              />
              <DetailStat
                icon="mountain"
                value={selected.elevationGainFt ? `${selected.elevationGainFt} ft` : '—'}
                label="Climb"
              />
              <DetailStat
                icon="star"
                value={selected.rating ? String(selected.rating) : '—'}
                label="Rating"
              />
            </View>

            <Text style={styles.detailDescription}>{selected.description}</Text>

            <View style={styles.amenities}>
              {selected.petFriendly ? <Pill label="Dogs allowed" tone="primary" size="sm" /> : null}
              {selected.familyFriendly ? <Pill label="Family friendly" tone="primary" size="sm" /> : null}
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
                    <Icon name="alert-circle" size={14} color={colors.warning} strokeWidth={2} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {selected.plants?.length || selected.animals?.length ? (
              <View>
                <Text style={styles.detailSection}>What lives here</Text>
                <View style={styles.amenities}>
                  {selected.plants?.map((p) => (
                    <Pill key={p} label={p} tone="primary" size="sm" icon="leaf" />
                  ))}
                  {selected.animals?.map((a) => (
                    <Pill key={a} label={a} tone="neutral" size="sm" icon="eye" />
                  ))}
                </View>
              </View>
            ) : null}

            <Divider />

            <View style={{ gap: SPACING.sm }}>
              <Button
                label="Start a walk here"
                icon="play"
                full
                onPress={() => {
                  setSelected(null);
                  navigation.navigate('Tabs', { screen: 'Track' });
                }}
              />
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <Button
                  label="Ask about it"
                  variant="secondary"
                  icon="help-circle"
                  style={{ flex: 1 }}
                  onPress={() => {
                    const t = selected;
                    setSelected(null);
                    navigation.navigate('Assistant', { trailId: t.id });
                  }}
                />
                <Button
                  label="Directions"
                  variant="secondary"
                  icon="navigation"
                  style={{ flex: 1 }}
                  onPress={() =>
                    Linking.openURL(
                      `https://maps.google.com/?q=${encodeURIComponent(`${selected.startLat},${selected.startLng}`)}`
                    )
                  }
                />
              </View>
            </View>

            <Text style={styles.detectionNote}>
              Start within about a third of a mile of the trailhead and EcoTrek recognises the trail
              automatically. Cover 70% of its length to log a completion.
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
  showDistance,
  onPress,
  formatDistance,
  unit,
}: {
  trail: Trail;
  completed: boolean;
  visited: boolean;
  showDistance: boolean;
  onPress: () => void;
  formatDistance: (m: number) => string;
  unit: string;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const difficultyTone =
    trail.difficulty === 'Easy' ? 'primary' : trail.difficulty === 'Moderate' ? 'warning' : 'danger';

  return (
    <Card onPress={onPress} style={styles.trailCard}>
      <View style={styles.trailHead}>
        <View style={[styles.trailIcon, completed && styles.trailIconDone]}>
          <Icon
            name={completed ? 'check' : trail.type === 'bike' ? 'bike' : trail.type === 'hike' ? 'boot' : 'route'}
            size={17}
            color={completed ? '#fff' : colors.primary}
            strokeWidth={completed ? 2.6 : 1.9}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.trailName} numberOfLines={1}>
            {trail.name}
          </Text>
          <Text style={styles.trailArea} numberOfLines={1}>
            {trail.area}
            {showDistance && trail.distanceFromUserMi != null
              ? ` · ${trail.distanceFromUserMi.toFixed(1)} mi away`
              : ''}
          </Text>
        </View>
      </View>

      <Text style={styles.trailDesc} numberOfLines={2}>
        {trail.description}
      </Text>

      <View style={styles.trailTags}>
        <Pill
          label={`${formatDistance(trail.distanceMiles)} ${unit}`}
          tone="neutral"
          size="sm"
          icon="activity"
        />
        <Pill
          label={trail.difficulty === 'Easy' ? 'Easy' : trail.difficulty === 'Moderate' ? 'Medium' : 'Hard'}
          tone={difficultyTone as any}
          size="sm"
        />
        {trail.petFriendly ? <Pill label="Dogs" tone="primary" size="sm" /> : null}
        {trail.waterStations ? <Pill label="Water" tone="neutral" size="sm" icon="droplet" /> : null}
        {trail.restroomsAvailable ? <Pill label="Bathrooms" tone="neutral" size="sm" /> : null}
        {completed ? <Pill label="Done" tone="primary" size="sm" icon="flag" /> : visited ? <Pill label="Visited" tone="neutral" size="sm" /> : null}
      </View>
    </Card>
  );
}

function DetailStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Icon name={icon} size={15} color={colors.textMuted} strokeWidth={1.9} />
      <Text style={styles.detailStatValue}>{value}</Text>
      <Text style={styles.detailStatLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  bannerAction: { ...t.smallMed, color: c.primary },

  askBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md - 2,
  },
  askIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: c.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askTitle: { ...t.h4, color: c.text },
  askSub: { ...t.small, color: c.textMuted, marginTop: 1 },

  searchRow: { flexDirection: 'row', gap: SPACING.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md - 4,
    height: 44,
  },
  searchInput: { flex: 1, ...t.body, color: c.text, paddingVertical: 0 },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { ...t.smallMed, color: c.textSecondary },
  chipTextActive: { color: '#fff' },

  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultCount: { ...t.small, color: c.textMuted },
  sortLabel: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sortLabelText: { ...t.smallMed, color: c.primary },

  grid: { gap: SPACING.sm },
  gridTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  gridFull: { width: '100%' },
  gridHalf: { width: '50%', padding: SPACING.xs },

  trailCard: { gap: SPACING.sm + 2 },
  trailHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  trailIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: c.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailIconDone: { backgroundColor: c.primary },
  trailName: { ...t.h4, color: c.text },
  trailArea: { ...t.small, color: c.textMuted, marginTop: 1 },
  trailDesc: { ...t.small, color: c.textSecondary },
  trailTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sortOptionText: { ...t.body, color: c.text },

  detailStats: { flexDirection: 'row' },
  detailStatValue: { ...t.h4, color: c.text },
  detailStatLabel: { ...t.micro, color: c.textMuted, textTransform: 'uppercase' },
  detailDescription: { ...t.body, color: c.textSecondary },
  detailSection: { ...t.overline, color: c.textMuted, marginBottom: SPACING.sm },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tipRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 7, alignItems: 'flex-start' },
  tipText: { ...t.small, color: c.textSecondary, flex: 1 },
  detectionNote: { ...t.small, color: c.textMuted },

  });
}
