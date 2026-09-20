import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import AssistantFab from '../components/AssistantFab';
import Slider from '../components/Slider';
import { Screen, Card, Pill, EmptyState, Sheet, Button, Banner, Divider } from '../components/ui';

import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { Trail } from '../constants/austinTrails';
import { useApp } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import { useActivity } from '../context/ActivityContext';
import { useResponsive } from '../hooks/useResponsive';
import { useResetOnLeave } from '../hooks/useResetOnLeave';
import { useTheme, Typography } from '../context/ThemeContext';
import { loadTrailRatings, trailPreferenceScore, TrailRatings } from '../services/trailRatings';
import {
  estimateElevationFt,
  estimateMinutes,
  formatMinutes,
  getTrailIntel,
  TrailIntel,
} from '../services/trailIntel';

type SortKey = 'nearest' | 'shortest' | 'longest' | 'easiest' | 'rating';

type FilterKey =
  | 'hike'
  | 'bike'
  | 'easy'
  | 'dogs'
  | 'family'
  | 'stroller'
  | 'water'
  | 'restrooms'
  | 'loop';

/** Multi-select — pick as many as you like, a trail must satisfy all of them. */
const FILTERS: { value: FilterKey; label: string; icon: IconName }[] = [
  { value: 'hike', label: 'Hiking', icon: 'boot' },
  { value: 'bike', label: 'Biking', icon: 'bike' },
  { value: 'easy', label: 'Easy', icon: 'check-circle' },
  { value: 'dogs', label: 'Dog friendly', icon: 'leaf' },
  { value: 'family', label: 'Family', icon: 'users' },
  { value: 'stroller', label: 'Stroller OK', icon: 'route' },
  { value: 'water', label: 'Water', icon: 'droplet' },
  { value: 'restrooms', label: 'Restrooms', icon: 'home' },
  { value: 'loop', label: 'Loop', icon: 'refresh' },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'shortest', label: 'Shortest' },
  { value: 'longest', label: 'Longest' },
  { value: 'easiest', label: 'Easiest' },
  { value: 'rating', label: 'Top rated' },
];

const DIFFICULTY_ORDER = { Easy: 0, Moderate: 1, Hard: 2 } as const;

/** Slider ceilings. Sitting at the top means "no limit". */
const LEN_MAX = 15; // trail length, miles
const AWAY_MAX = 50; // distance from the user, miles
const CLIMB_MAX = 2000; // elevation gain, ft

function trailMatchesFilter(t: Trail, f: FilterKey): boolean {
  switch (f) {
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
    case 'stroller':
      return !!t.strollerFriendly;
    case 'water':
      return !!t.waterStations;
    case 'restrooms':
      return !!t.restroomsAvailable;
    case 'loop':
      return !!t.isLoop;
  }
}

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
    locating,
  } = useApp();
  const { formatDistanceCompact, formatDistanceUnit } = useSettings();
  const { history } = useActivity();
  const { isTablet } = useResponsive();
  const openedRef = useRef(false);

  // Opening Trails is the location request. It also kicks off the bounded
  // three-attempt catalogue lookup in AppContext, so the first screen visit
  // behaves like the user already pressed Retry a couple of times.
  useFocusEffect(
    useCallback(() => {
      if (openedRef.current) return;
      openedRef.current = true;
      let alive = true;
      requestLocation().then((found) => {
        if (alive && !found) refreshTrails();
      });
      return () => {
        alive = false;
      };
    }, [requestLocation, refreshTrails])
  );

  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());
  const [maxLen, setMaxLen] = useState(LEN_MAX);
  const [maxAway, setMaxAway] = useState(AWAY_MAX);
  const [maxClimb, setMaxClimb] = useState(CLIMB_MAX);
  const [sort, setSort] = useState<SortKey>('nearest');
  const [ratings, setRatings] = useState<TrailRatings>({});
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadTrailRatings().then((saved) => active && setRatings(saved));
      return () => { active = false; };
    }, [])
  );
  const [selected, setSelected] = useState<Trail | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const resetFilters = useCallback(() => {
    setFilters(new Set());
    setMaxLen(LEN_MAX);
    setMaxAway(AWAY_MAX);
    setMaxClimb(CLIMB_MAX);
  }, []);

  useResetOnLeave(
    useCallback(() => {
      resetFilters();
      setSort('nearest');
      setQuery('');
      setSelected(null);
      setShowFilters(false);
    }, [resetFilters])
  );

  const toggleFilter = useCallback((f: FilterKey) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }, []);

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

  const sliderCount = (maxLen < LEN_MAX ? 1 : 0) + (maxAway < AWAY_MAX ? 1 : 0) + (maxClimb < CLIMB_MAX ? 1 : 0);
  const activeFilterCount = filters.size + sliderCount;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matches = trails.filter((t) => {
      if (q && !`${t.name} ${t.area} ${t.description}`.toLowerCase().includes(q)) return false;
      for (const f of filters) {
        if (!trailMatchesFilter(t, f)) return false;
      }
      if (maxLen < LEN_MAX && t.distanceMiles > maxLen) return false;
      if (maxAway < AWAY_MAX && (t.distanceFromUserMi ?? 0) > maxAway) return false;
      if (maxClimb < CLIMB_MAX && estimateElevationFt(t) > maxClimb) return false;
      return true;
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
      default: {
        // Ratings tailor discovery without hiding nearby choices. Trails that
        // resemble a highly-rated trail (same activity and difficulty) receive
        // a modest distance bonus; low ratings push similar options down.
        sorted.sort((a, b) => {
          const aRank = (a.distanceFromUserMi ?? 50) - trailPreferenceScore(a, trails, ratings) * 0.4;
          const bRank = (b.distanceFromUserMi ?? 50) - trailPreferenceScore(b, trails, ratings) * 0.4;
          return aRank - bRank;
        });
        break;
      }
    }
    return sorted;
  }, [trails, filters, maxLen, maxAway, maxClimb, sort, query, ratings]);

  const completedCount = completedIds.size;

  return (
    <View style={{ flex: 1 }}>
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
          <Pressable
            onPress={() => setShowFilters(true)}
            style={styles.sortBtn}
            accessibilityLabel="Filters and sort"
          >
            <Icon name="filter" size={16} color={colors.textSecondary} strokeWidth={1.9} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
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

        {/* Quick filters — tap several, they stack */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={resetFilters}
            style={[styles.chip, activeFilterCount === 0 && styles.chipActive]}
          >
            <Icon
              name="map"
              size={13}
              color={activeFilterCount === 0 ? '#fff' : colors.textMuted}
              strokeWidth={2}
            />
            <Text style={[styles.chipText, activeFilterCount === 0 && styles.chipTextActive]}>All</Text>
          </Pressable>
          {FILTERS.slice(0, 3).map((f) => {
            const active = filters.has(f.value);
            return (
              <Pressable
                key={f.value}
                onPress={() => toggleFilter(f.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Icon
                  name={active ? 'check' : f.icon}
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
            {sliderCount > 0
              ? ` · ${[
                  maxLen < LEN_MAX ? `≤ ${maxLen} mi long` : null,
                  maxAway < AWAY_MAX ? `≤ ${maxAway} mi away` : null,
                  maxClimb < CLIMB_MAX ? `≤ ${maxClimb} ft climb` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}`
              : ''}
          </Text>
          <Pressable onPress={() => setShowFilters(true)} hitSlop={8} style={styles.sortLabel}>
            <Text style={styles.sortLabelText}>
              {SORTS.find((s) => s.value === sort)?.label}
            </Text>
            <Icon name="chevron-down" size={13} color={colors.primary} strokeWidth={2.2} />
          </Pressable>
        </View>

        {trails.length === 0 && (trailsLoading || locating) ? (
          <EmptyState
            icon={locating && usingFallbackLocation ? 'map-pin' : 'map'}
            title={locating && usingFallbackLocation ? 'Finding your location' : 'Looking for trails'}
            message={
              locating && usingFallbackLocation
                ? 'Hang tight — once we know where you are, we will look up walks and rides around you.'
                : 'Checking OpenStreetMap around you. This can take a few seconds on a slow connection.'
            }
          />
        ) : trails.length === 0 ? (
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
            message="Try removing a filter, raising a slider, or clearing the search."
            action="Reset"
            onAction={() => {
              resetFilters();
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

      {/* Filters & sort */}
      <Sheet visible={showFilters} onClose={() => setShowFilters(false)} title="Filter trails">
        <View style={{ gap: SPACING.md }}>
          <Slider
            label="Trail length"
            value={maxLen}
            min={1}
            max={LEN_MAX}
            step={1}
            onChange={setMaxLen}
            valueLabel={`under ${maxLen} mi`}
            maxLabel="Any length"
          />
          <Slider
            label="Distance from you"
            value={maxAway}
            min={5}
            max={AWAY_MAX}
            step={5}
            onChange={setMaxAway}
            valueLabel={`under ${maxAway} mi away`}
            maxLabel="Any distance"
          />
          <Slider
            label="Elevation gain"
            value={maxClimb}
            min={100}
            max={CLIMB_MAX}
            step={100}
            onChange={setMaxClimb}
            valueLabel={`under ${maxClimb} ft`}
            maxLabel="Any climb"
          />

          <Divider />

          <Text style={styles.sheetSection}>Show only</Text>
          <View style={styles.filterRow}>
            {FILTERS.map((f) => {
              const active = filters.has(f.value);
              return (
                <Pressable
                  key={f.value}
                  onPress={() => toggleFilter(f.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Icon
                    name={active ? 'check' : f.icon}
                    size={13}
                    color={active ? '#fff' : colors.textMuted}
                    strokeWidth={2}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Divider />

          <Text style={styles.sheetSection}>Sort by</Text>
          <View style={{ gap: SPACING.xs }}>
            {SORTS.map((s) => (
              <Pressable
                key={s.value}
                onPress={() => setSort(s.value)}
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

          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <Button
              label="Reset"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={resetFilters}
            />
            <Button
              label={`Show ${filtered.length} trail${filtered.length === 1 ? '' : 's'}`}
              style={{ flex: 2 }}
              onPress={() => setShowFilters(false)}
            />
          </View>
        </View>
      </Sheet>

      {/* Trail detail */}
      <Sheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={selected ? `${selected.area} · ${selected.difficulty}` : undefined}
      >
        {selected ? (
          <TrailDetail
            trail={selected}
            completed={completedIds.has(selected.id)}
            onStart={() => {
              setSelected(null);
              navigation.navigate('Tabs', { screen: 'Track', params: { mode: selected.type === 'bike' ? 'bike' : 'hike' } });
            }}
            onAsk={() => {
              const t = selected;
              setSelected(null);
              navigation.navigate('Assistant', { trailId: t.id });
            }}
            formatDistance={formatDistanceCompact}
            unit={formatDistanceUnit()}
          />
        ) : null}
      </Sheet>
    </Screen>

    {/* Floating AI chat button */}
    <AssistantFab />
    </View>
  );
}

/* ── Detail sheet ─────────────────────────────────────────────────────── */

function TrailDetail({
  trail,
  completed,
  onStart,
  onAsk,
  formatDistance,
  unit,
}: {
  trail: Trail;
  completed: boolean;
  onStart: () => void;
  onAsk: () => void;
  formatDistance: (m: number) => string;
  unit: string;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const [intel, setIntel] = useState<TrailIntel | null>(null);

  useEffect(() => {
    let alive = true;
    setIntel(null);
    getTrailIntel(trail).then((i) => {
      if (alive) setIntel(i);
    });
    return () => {
      alive = false;
    };
  }, [trail]);

  const climb = estimateElevationFt(trail);
  const climbEstimated = trail.elevationGainFt == null;
  const mins = estimateMinutes(trail);

  return (
    <View style={{ gap: SPACING.md }}>
      {completed ? (
        <Banner
          tone="success"
          icon="check-circle"
          title="You have completed this trail"
          message="It counts toward your Trail Master badge."
        />
      ) : null}

      {/* Key numbers — length, climb, average time, rating */}
      <View style={styles.detailStats}>
        <DetailStat
          icon="activity"
          value={`${formatDistance(trail.distanceMiles)} ${unit}`}
          label="Length"
        />
        <DetailStat
          icon="mountain"
          value={`${climbEstimated ? '~' : ''}${climb} ft`}
          label="Climb"
        />
        <DetailStat icon="clock" value={formatMinutes(mins)} label="Avg time" />
        <DetailStat
          icon="star"
          value={trail.rating ? String(trail.rating) : '—'}
          label="Rating"
        />
      </View>

      <Text style={styles.detailDescription}>{trail.description}</Text>

      {/* AI trail notes */}
      {intel ? (
        <View style={styles.aiCard}>
          <View style={styles.aiHead}>
            <Icon name="sparkles" size={15} color={colors.primary} strokeWidth={2} />
            <Text style={styles.aiTitle}>{intel.fromAI ? 'AI trail notes' : 'Trail notes'}</Text>
          </View>
          <Text style={styles.aiText}>{intel.summary}</Text>
          <Text style={styles.aiLabel}>Terrain</Text>
          <Text style={styles.aiText}>{intel.terrain}</Text>
          <Text style={styles.aiLabel}>Highlights</Text>
          <Text style={styles.aiText}>{intel.highlights}</Text>
          {intel.fromAI ? (
            <Text style={styles.aiDisclaimer}>Generated by AI — conditions can differ on the day.</Text>
          ) : null}
        </View>
      ) : (
        <View style={[styles.aiCard, styles.aiCardLoading]}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={styles.aiLoadingText}>Pulling trail details…</Text>
        </View>
      )}

      <View style={styles.amenities}>
        {trail.petFriendly ? <Pill label="Dogs allowed" tone="primary" size="sm" /> : null}
        {trail.familyFriendly ? <Pill label="Family friendly" tone="primary" size="sm" /> : null}
        {trail.strollerFriendly ? <Pill label="Stroller OK" tone="neutral" size="sm" /> : null}
        {trail.restroomsAvailable ? <Pill label="Restrooms" tone="neutral" size="sm" /> : null}
        {trail.waterStations ? <Pill label="Water" tone="neutral" size="sm" /> : null}
        {trail.isLoop ? <Pill label="Loop" tone="neutral" size="sm" /> : null}
      </View>

      {trail.safetyTips.length > 0 ? (
        <View>
          <Text style={styles.detailSection}>Before you go</Text>
          {trail.safetyTips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Icon name="alert-circle" size={14} color={colors.warning} strokeWidth={2} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {trail.plants?.length || trail.animals?.length ? (
        <View>
          <Text style={styles.detailSection}>What lives here</Text>
          <View style={styles.amenities}>
            {trail.plants?.map((p) => (
              <Pill key={p} label={p} tone="primary" size="sm" icon="leaf" />
            ))}
            {trail.animals?.map((a) => (
              <Pill key={a} label={a} tone="neutral" size="sm" icon="eye" />
            ))}
          </View>
        </View>
      ) : null}

      <Divider />

      <View style={{ gap: SPACING.sm }}>
        <Button label={trail.type === 'bike' ? 'Start a ride here' : 'Start a walk here'} icon="play" full onPress={onStart} />
        <Button
          label="Ask AI about it"
          variant="secondary"
          icon="sparkles"
          full
          onPress={onAsk}
        />
      </View>

      <Text style={styles.detectionNote}>
        Start within about a third of a mile of the trailhead and EcoTrek recognises the trail
        automatically. Cover 70% of its length to log a completion.
      </Text>
    </View>
  );
}

/* ── List card ────────────────────────────────────────────────────────── */

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
        <View style={{ flex: 1, minWidth: 0 }}>
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
        <Pill label={formatMinutes(estimateMinutes(trail))} tone="neutral" size="sm" icon="clock" />
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
    <View style={{ flexBasis: '45%', flexGrow: 1, minWidth: 0, gap: 3 }}>
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
    gap: SPACING.md - 2,
    backgroundColor: c.surface,
    borderWidth: 0,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
  },
  askIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
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
    borderWidth: 0,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  searchInput: { flex: 1, minWidth: 0, ...t.body, color: c.text, paddingVertical: 0 },
  sortBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.surface,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { ...t.micro, color: '#fff', fontWeight: '700' },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: c.surface,
    borderWidth: 0,
  },
  chipActive: { backgroundColor: c.primary },
  chipText: { ...t.smallMed, color: c.textSecondary },
  chipTextActive: { color: '#fff' },

  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultCount: { ...t.small, color: c.textMuted, flex: 1, marginRight: SPACING.sm },
  sortLabel: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sortLabelText: { ...t.smallMed, color: c.primary },

  grid: { gap: SPACING.md },
  gridTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  gridFull: { width: '100%' },
  gridHalf: { width: '50%', padding: SPACING.xs },

  trailCard: { gap: SPACING.md - 2 },
  trailHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 2 },
  trailIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: c.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailIconDone: { backgroundColor: c.primary },
  trailName: { ...t.h4, color: c.text },
  trailArea: { ...t.small, color: c.textMuted, marginTop: 1 },
  trailDesc: { ...t.small, color: c.textSecondary },
  trailTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  sheetSection: { ...t.overline, color: c.textMuted },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sortOptionText: { ...t.body, color: c.text },

  detailStats: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  detailStatValue: { ...t.h4, color: c.text },
  detailStatLabel: { ...t.micro, color: c.textMuted, textTransform: 'uppercase' },
  detailDescription: { ...t.body, color: c.textSecondary },
  detailSection: { ...t.overline, color: c.textMuted, marginBottom: SPACING.xs },

  aiCard: {
    backgroundColor: c.primarySurface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.xs + 2,
  },
  aiCardLoading: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiTitle: { ...t.h4, color: c.primaryDark },
  aiLabel: { ...t.overline, color: c.primary, marginTop: 2 },
  aiText: { ...t.small, color: c.textSecondary },
  aiDisclaimer: { ...t.micro, color: c.textLight, marginTop: 2, fontStyle: 'italic' },
  aiLoadingText: { ...t.small, color: c.textMuted },

  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tipRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 7, alignItems: 'flex-start' },
  tipText: { ...t.small, color: c.textSecondary, flex: 1 },
  detectionNote: { ...t.small, color: c.textMuted },

  });
}
