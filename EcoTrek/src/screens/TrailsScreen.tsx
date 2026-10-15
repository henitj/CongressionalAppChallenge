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
import { TrailRatingControls } from '../components/TrailRatingSheet';
import Slider from '../components/Slider';
import { TrailCover, TrailPhotoGallery } from '../components/TrailPhotos';
import { Screen, Card, Pill, EmptyState, Sheet, Button, Divider } from '../components/ui';

import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { Trail } from '../constants/austinTrails';
import { useApp } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import { useActivity } from '../context/ActivityContext';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useResetOnLeave } from '../hooks/useResetOnLeave';
import { useTheme, Typography } from '../context/ThemeContext';
import { loadTrailRatings, trailPreferenceScore, TrailRatings } from '../services/trailRatings';
import {
  estimateElevationFt,
  estimateMinutes,
  formatMinutes,
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
  { value: 'rating', label: 'Your highest rated' },
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
    trailsSource,
    trailsError,
  } = useApp();
  const { formatDistanceCompact, formatDistanceUnit } = useSettings();
  const { history } = useActivity();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { isTablet } = useResponsive();
  const openedRef = useRef(false);

  // The offline collection/saved cards are already usable. Opening Trails
  // requests a real fix once and enriches the list without blocking it.
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
      setRatings({});
      loadTrailRatings(userId).then((saved) => active && setRatings(saved));
      return () => { active = false; };
    }, [userId])
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
    if (match) { setSelected(match); navigation.setParams({ focusTrailId: undefined }); }
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
        sorted.sort((a, b) => (ratings[b.id] ?? 0) - (ratings[a.id] ?? 0) || (a.distanceFromUserMi ?? 0) - (b.distanceFromUserMi ?? 0));
        break;
      default: {
        if (usingFallbackLocation) return sorted;
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
  }, [trails, filters, maxLen, maxAway, maxClimb, sort, query, ratings, usingFallbackLocation]);

  const saveRating = (id: string, stars: number) => setRatings((previous) => {
    const next = { ...previous };
    if (stars) next[id] = stars; else delete next[id];
    return next;
  });
  const subtitle = trailsSource === 'collection' ? 'Offline collection · Austin, TX' : trailsSource === 'cached' ? `${trailsRegion ?? 'Saved trails'} · saved` : trailsRegion ?? (trailsSource === 'unsupported' ? 'Outside our discovery area' : 'Walks and rides near you');

  return (
    <Screen refreshControl={<RefreshControl refreshing={trailsLoading && trails.length === 0} onRefresh={refreshTrails} tintColor={colors.textMuted} />}>
      <Header title="Trails" subtitle={subtitle} back actions={[{ icon: 'shield', onPress: () => navigation.navigate('Safety'), label: 'Safety' }]} />
      <View style={styles.body}>
        <View style={styles.searchRow}>
          <View style={styles.search}><Icon name="search" size={17} color={colors.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search trails" accessibilityLabel="Search trails" placeholderTextColor={colors.textMuted} style={styles.searchInput} autoCorrect={false} returnKeyType="search" />{query ? <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search"><Icon name="x" size={16} color={colors.textMuted} /></Pressable> : null}</View>
          <Pressable onPress={() => setShowFilters(true)} style={styles.sortBtn} accessibilityRole="button" accessibilityLabel="Filters and sort"><Icon name="filter" size={19} color={colors.primary} />{activeFilterCount > 0 ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View> : null}</Pressable>
        </View>
        {usingFallbackLocation ? <View style={styles.locationRow}>
          <Icon name="map-pin" size={17} color={colors.textMuted} />
          <Text style={[styles.locationText, { flex: 1 }]}>{locating ? 'Finding nearby trails. Keep browsing meanwhile.' : trailsSource === 'cached' ? 'Saved trails, not a current location lookup.' : 'Browse Austin offline, or find trails near you.'}</Text>
          <Pressable onPress={() => requestLocation({ explain: true })} style={{ minHeight: 44, justifyContent: 'center' }} accessibilityRole="button"><Text style={styles.bannerAction}>{permission === 'denied' ? 'Settings' : 'Use location'}</Text></Pressable>
        </View> : null}
        {trailsError ? <Text style={styles.locationText} accessibilityLiveRegion="polite">{trailsError}</Text> : null}
        <View style={styles.filterRow}>
          <Pressable onPress={resetFilters} style={[styles.chip, activeFilterCount === 0 && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: activeFilterCount === 0 }}><Text style={[styles.chipText, activeFilterCount === 0 && styles.chipTextActive]}>All</Text></Pressable>
          {FILTERS.slice(0, 3).map((filter) => { const active = filters.has(filter.value); return <Pressable key={filter.value} onPress={() => toggleFilter(filter.value)} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: active }}><Icon name={active ? 'check' : filter.icon} size={14} color={active ? colors.textInverse : colors.textMuted} /><Text style={[styles.chipText, active && styles.chipTextActive]}>{filter.label}</Text></Pressable>; })}
        </View>
        <View style={styles.resultRow}><Text style={styles.resultCount}>{filtered.length} trail{filtered.length === 1 ? '' : 's'}{activeFilterCount ? ' · filtered' : ''}</Text><Pressable onPress={() => setShowFilters(true)} style={styles.sortLabel} accessibilityRole="button" accessibilityLabel="Change trail sorting"><Text style={styles.sortLabelText}>{sort === 'nearest' && usingFallbackLocation ? 'Collection order' : SORTS.find((item) => item.value === sort)?.label}</Text><Icon name="chevron-down" size={14} color={colors.primary} /></Pressable></View>
        {trails.length === 0 && trailsSource === 'unsupported' ? <EmptyState icon="globe" title="This region isn’t supported yet" message="Nearby discovery currently covers the US, Canada and Mexico." /> : trails.length === 0 && (trailsLoading || locating) ? <View style={{ gap: 14 }}><View style={styles.loadingRow}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.locationText}>Finding nearby trails…</Text></View>{[0, 1].map((i) => <View key={i} style={styles.skeleton}><View style={styles.skeletonCover} /><View style={styles.skeletonLine} /><View style={[styles.skeletonLine, { width: '55%' }]} /></View>)}</View> : trails.length === 0 ? <EmptyState icon="map-pin" title="No trails found here yet" message="The trail service may be offline, or there may be no named routes nearby." action="Refresh nearby trails" onAction={refreshTrails} /> : filtered.length === 0 ? <EmptyState icon="map" title="No trails match" message="Try clearing the search or removing a filter." action="Reset" onAction={() => { resetFilters(); setQuery(''); }} /> : <View style={[styles.grid, isTablet && styles.gridTablet]}>{filtered.map((trail) => <View key={trail.id} style={isTablet ? styles.gridHalf : styles.gridFull}><TrailCard trail={trail} completed={completedIds.has(trail.id)} visited={visitedIds.has(trail.id)} showDistance={!usingFallbackLocation && trailsSource !== 'collection'} rating={ratings[trail.id]} onPress={() => setSelected(trail)} formatDistance={formatDistanceCompact} unit={formatDistanceUnit()} styles={styles} colors={colors} /></View>)}</View>}
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

      <Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''} subtitle={selected ? `${selected.area} · ${selected.difficulty}` : undefined}>
        {selected ? <TrailDetail key={selected.id} userId={userId} trail={selected} rating={ratings[selected.id]} completed={completedIds.has(selected.id)} onRatingSaved={(stars) => saveRating(selected.id, stars)} onStart={() => { setSelected(null); navigation.navigate('Tabs', { screen: 'Track', params: { mode: selected.type === 'bike' ? 'bike' : 'hike' } }); }} formatDistance={formatDistanceCompact} unit={formatDistanceUnit()} /> : null}
      </Sheet>
    </Screen>
  );
}

/** Only the essentials open by default. No AI request or article is fetched. */
function TrailDetail({ trail, userId, completed, rating, onRatingSaved, onStart, formatDistance, unit }: {
  trail: Trail;
  userId: string | null;
  completed: boolean;
  rating?: number;
  onRatingSaved: (stars: number) => void;
  onStart: () => void;
  formatDistance: (miles: number) => string;
  unit: string;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const [notes, setNotes] = useState(false);
  const [before, setBefore] = useState(false);
  const [photos, setPhotos] = useState(false);
  return <View style={{ gap: 18 }}>
    <View style={styles.detailStats}>
      <DetailStat value={`${trail.id.startsWith('osm-') ? '~' : ''}${formatDistance(trail.distanceMiles)} ${unit}`} label="Length" />
      <DetailStat value={formatMinutes(estimateMinutes(trail))} label="Est. time" />
      <DetailStat value={`${trail.elevationGainFt == null ? '~' : ''}${estimateElevationFt(trail)} ft`} label="Climb" />
    </View>
    <Text style={styles.detailDescription} numberOfLines={2}>{trail.description}</Text>
    {completed ? <View style={styles.loadingRow}><Icon name="check-circle" size={17} color={colors.primary} /><Text style={styles.locationText}>You’ve completed this trail.</Text></View> : null}
    <View style={styles.ratingPanel}><TrailRatingControls userId={userId} trailId={trail.id} initialRating={rating} onSaved={onRatingSaved} /></View>
    <Button label={trail.type === 'bike' ? 'Start a ride here' : 'Start a walk here'} icon="play" full onPress={onStart} />
    <View>
      <Disclosure label="Before you go" open={before} toggle={() => setBefore((value) => !value)} />
      {before ? <View style={styles.disclosed}><Text style={styles.tipText}>Check opening hours, closures and current conditions before heading out. Catalogue distances and facilities can be approximate.</Text>{trail.safetyTips.map((tip, i) => <Text key={i} style={styles.tipText}>• {tip}</Text>)}<Text style={styles.tipText}>For automatic recognition, start within about a third of a mile of the trailhead. Cover 70% of its recorded length to log a completion.</Text></View> : null}
      <Disclosure label="Trail notes & amenities" open={notes} toggle={() => setNotes((value) => !value)} />
      {notes ? <View style={styles.disclosed}>
        <Text style={styles.detailDescription}>{trail.description}</Text>
        <View style={styles.amenities}>{trail.petFriendly ? <Pill label="Dogs allowed" tone="primary" size="sm" /> : null}{trail.familyFriendly ? <Pill label="Family friendly" tone="primary" size="sm" /> : null}{trail.strollerFriendly ? <Pill label="Stroller OK" tone="neutral" size="sm" /> : null}{trail.restroomsAvailable ? <Pill label="Restrooms" tone="neutral" size="sm" /> : null}{trail.waterStations ? <Pill label="Water" tone="neutral" size="sm" /> : null}{trail.isLoop ? <Pill label="Loop" tone="neutral" size="sm" /> : null}</View>
        {trail.plants?.length ? <Text style={styles.tipText}>Plants: {trail.plants.join(', ')}</Text> : null}{trail.animals?.length ? <Text style={styles.tipText}>Wildlife: {trail.animals.join(', ')}</Text> : null}
      </View> : null}
      <Disclosure label="Photos" open={photos} toggle={() => setPhotos((value) => !value)} />
      {photos ? <View style={styles.disclosed}><TrailPhotoGallery trail={trail} /></View> : null}
    </View>
  </View>;
}
function Disclosure({ label, open, toggle }: { label: string; open: boolean; toggle: () => void }) {
  const { colors, typography } = useTheme();
  return <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.borderLight }}><Text style={[typography.smallMed, { color: colors.text }]}>{label}</Text><Icon name={open ? 'chevron-down' : 'chevron-right'} size={17} color={colors.textMuted} /></Pressable>;
}
const TrailCard = React.memo(function TrailCard({ trail, completed, visited, showDistance, rating, onPress, formatDistance, unit, styles, colors }: {
  trail: Trail;
  completed: boolean;
  visited: boolean;
  showDistance: boolean;
  rating?: number;
  onPress: () => void;
  formatDistance: (miles: number) => string;
  unit: string;
  styles: ReturnType<typeof makeStyles>;
  colors: ColorPalette;
}) {
  return <Card style={styles.trailCard}>
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${trail.name}`} style={{ gap: 13 }}>
      <TrailCover trail={trail} loadRemote={false} />
      <View style={styles.trailHead}><View style={[styles.trailIcon, completed && { backgroundColor: colors.primary }]}><Icon name={completed ? 'check' : trail.type === 'bike' ? 'bike' : trail.type === 'hike' ? 'boot' : 'route'} size={18} color={completed ? colors.textInverse : colors.primary} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.trailName} numberOfLines={2}>{trail.name}</Text><Text style={styles.trailArea} numberOfLines={1}>{trail.area}{showDistance && trail.distanceFromUserMi != null ? ` · ${formatDistance(trail.distanceFromUserMi)} ${unit} away` : ''}</Text></View></View>
      <Text style={styles.trailMeta}>{formatDistance(trail.distanceMiles)} {unit} · {trail.difficulty} · {formatMinutes(estimateMinutes(trail))}{completed ? ' · Completed' : visited ? ' · Visited' : ''}</Text>
    </Pressable>
    <Pressable onPress={onPress} style={styles.cardRating} accessibilityRole="button" accessibilityLabel={`Rate ${trail.name}`}><Icon name="star" size={17} filled={!!rating} color={rating ? colors.accentDark : colors.textMuted} /><Text style={styles.sortLabelText}>{rating ? `Your rating: ${rating}/5` : 'Rate trail'}</Text><Icon name="chevron-right" size={14} color={colors.primary} /></Pressable>
  </Card>;
});
function DetailStat({ value, label }: { value: string; label: string }) {
  const { colors, typography } = useTheme();
  return <View style={{ flex: 1, minWidth: 75, gap: 4 }}><Text style={[typography.h4, { color: colors.text }]}>{value}</Text><Text style={[typography.micro, { color: colors.textMuted }]}>{label}</Text></View>;
}
function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: 16 },
    bannerAction: { ...t.smallMed, color: c.primary },
    searchRow: { flexDirection: 'row', gap: 9 },
    search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: c.surface, borderRadius: RADIUS.pill, paddingHorizontal: 16, height: 48 },
    searchInput: { flex: 1, minWidth: 0, ...t.body, color: c.text, paddingVertical: 0 },
    sortBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    filterBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    filterBadgeText: { ...t.micro, color: c.textInverse, fontWeight: '700' },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40, paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.pill, backgroundColor: c.surface },
    chipActive: { backgroundColor: c.primary }, chipText: { ...t.smallMed, color: c.textSecondary }, chipTextActive: { color: c.textInverse },
    resultRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    resultCount: { ...t.small, color: c.textMuted },
    sortLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 }, sortLabelText: { ...t.smallMed, color: c.primary },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, locationText: { ...t.small, color: c.textMuted },
    grid: { gap: 16 }, gridTablet: { flexDirection: 'row', flexWrap: 'wrap' }, gridFull: { width: '100%' }, gridHalf: { width: '50%', padding: 4 },
    trailCard: { gap: 10 }, trailHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    trailIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.primarySurface, alignItems: 'center', justifyContent: 'center' },
    trailName: { ...t.h4, color: c.text }, trailArea: { ...t.small, color: c.textMuted, marginTop: 4 }, trailMeta: { ...t.small, color: c.textSecondary },
    cardRating: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', minHeight: 36 },
    sheetSection: { ...t.overline, color: c.textMuted }, sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }, sortOptionText: { ...t.body, color: c.text },
    detailStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    detailDescription: { ...t.small, color: c.textSecondary, lineHeight: Math.max(22, t.small.lineHeight ?? 22) },
    ratingPanel: { padding: 14, borderRadius: 18, backgroundColor: c.surfaceSunken },
    amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tipText: { ...t.small, color: c.textSecondary, lineHeight: Math.max(22, t.small.lineHeight ?? 22) },
    disclosed: { gap: 12, paddingBottom: 18, paddingTop: 6 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    skeleton: { backgroundColor: c.surface, borderRadius: 20, padding: 16, gap: 13 }, skeletonCover: { height: 120, backgroundColor: c.surfaceSunken, borderRadius: 14 }, skeletonLine: { height: 12, width: '80%', backgroundColor: c.surfaceSunken, borderRadius: 6 },
  });
}
