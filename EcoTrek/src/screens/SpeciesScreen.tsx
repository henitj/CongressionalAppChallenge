import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import {
  Screen,
  Card,
  ProgressBar,
  Sheet,
  Button,
  Divider,
  EmptyState,
} from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import {
  rarityLabel,
  Species,
  SPECIES,
  speciesForTrail,
  trailsForSpecies,
} from '../constants/species';
import { useLogbook } from '../context/LogbookContext';
import { useApp } from '../context/AppContext';
import { detectCurrentTrail } from '../services/trailDetection';
import { useResponsive } from '../hooks/useResponsive';

type Filter = 'all' | 'plant' | 'animal' | 'found' | 'missing' | 'nearby';

/**
 * Species checklist.
 *
 * The catalogue is generated from the plants and animals already listed on
 * each trail, so this is a view of existing data rather than a second list to
 * maintain. Each species pays out once — the points reward noticing something
 * new, not tapping repeatedly.
 */
export default function SpeciesScreen() {
  const navigation = useNavigation<any>();
  const {
    hasLogged,
    logSighting,
    removeSighting,
    speciesLogged,
    plantsLogged,
    animalsLogged,
    totalSpecies,
    completionPercent,
    sightings,
  } = useLogbook();
  const { coords, trails } = useApp();
  const { isTablet } = useResponsive();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Species | null>(null);
  const [justLogged, setJustLogged] = useState<string | null>(null);

  // If we can tell which trail they are on, "nearby" becomes meaningful.
  const currentTrail = useMemo(
    () =>
      detectCurrentTrail(
        coords ? { ...coords, timestamp: Date.now() } : undefined,
        trails.length ? trails : undefined
      ),
    [coords, trails]
  );

  const nearbyIds = useMemo(
    () => new Set(currentTrail ? speciesForTrail(currentTrail.id).map((s) => s.id) : []),
    [currentTrail]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SPECIES.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      switch (filter) {
        case 'plant':
          return s.kind === 'plant';
        case 'animal':
          return s.kind === 'animal';
        case 'found':
          return hasLogged(s.id);
        case 'missing':
          return !hasLogged(s.id);
        case 'nearby':
          return nearbyIds.has(s.id);
        default:
          return true;
      }
    });
  }, [filter, query, hasLogged, nearbyIds]);

  const handleLog = async (species: Species) => {
    const added = await logSighting(species.id, currentTrail?.id ?? null);
    if (added) {
      setJustLogged(species.id);
      setTimeout(() => setJustLogged((v) => (v === species.id ? null : v)), 1600);
    }
  };

  const lastSeen = (speciesId: string) =>
    sightings.find((s) => s.speciesId === speciesId)?.loggedAt ?? null;

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'missing', label: 'To find' },
    { value: 'found', label: 'Found' },
    { value: 'plant', label: 'Plants' },
    { value: 'animal', label: 'Animals' },
    ...(currentTrail ? ([{ value: 'nearby', label: 'Here now' }] as const) : []),
  ];

  return (
    <Screen>
      <Header title="Species" subtitle="Field checklist" back />

      <View style={styles.body}>
        {/* Progress */}
        <Card>
          <View style={styles.progressTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressValue}>
                {speciesLogged}
                <Text style={styles.progressTotal}> / {totalSpecies}</Text>
              </Text>
              <Text style={styles.progressLabel}>species logged</Text>
            </View>
            <View style={styles.splitCounts}>
              <SplitCount icon="leaf" value={plantsLogged} label="plants" />
              <SplitCount icon="eye" value={animalsLogged} label="animals" />
            </View>
          </View>
          <ProgressBar percent={completionPercent} style={{ marginTop: SPACING.md - 2 }} />
          <Text style={styles.progressHint}>
            {speciesLogged === totalSpecies
              ? 'Every species in the catalogue. Genuinely impressive.'
              : `${totalSpecies - speciesLogged} still to find across the Austin trails.`}
          </Text>
        </Card>

        {currentTrail ? (
          <Pressable
            style={styles.hereCard}
            onPress={() => setFilter('nearby')}
          >
            <View style={styles.hereIcon}>
              <Icon name="map-pin" size={16} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hereTitle}>You are near {currentTrail.name}</Text>
              <Text style={styles.hereSub}>
                {nearbyIds.size} species are listed here — tap to filter
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={COLORS.textLight} />
          </Pressable>
        ) : null}

        {/* Search */}
        <View style={styles.search}>
          <Icon name="search" size={16} color={COLORS.textLight} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search species"
            placeholderTextColor={COLORS.textLight}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="x" size={15} color={COLORS.textLight} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>

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

        {visible.length === 0 ? (
          <EmptyState
            icon="search"
            title="Nothing matches"
            message="Try a different filter or clear the search."
            action="Reset"
            onAction={() => {
              setFilter('all');
              setQuery('');
            }}
          />
        ) : (
          <View style={[styles.list, isTablet && styles.listTablet]}>
            {visible.map((s) => {
              const found = hasLogged(s.id);
              const flash = justLogged === s.id;
              return (
                <View key={s.id} style={isTablet ? styles.cellHalf : styles.cellFull}>
                  <Pressable
                    onPress={() => setSelected(s)}
                    style={({ pressed }) => [
                      styles.row,
                      found && styles.rowFound,
                      flash && styles.rowFlash,
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <View style={[styles.rowIcon, found && styles.rowIconFound]}>
                      <Icon
                        name={found ? 'check' : s.kind === 'plant' ? 'leaf' : 'eye'}
                        size={16}
                        color={found ? '#fff' : COLORS.textMuted}
                        strokeWidth={found ? 2.6 : 1.9}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, found && styles.rowNameFound]} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {s.kind === 'plant' ? 'Plant' : 'Animal'} · {rarityLabel(s)} ·{' '}
                        {s.trailIds.length} trail{s.trailIds.length === 1 ? '' : 's'}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => (found ? setSelected(s) : handleLog(s))}
                      hitSlop={10}
                      style={styles.logButton}
                      accessibilityLabel={found ? `${s.name} already logged` : `Log ${s.name}`}
                    >
                      {found ? (
                        <Text style={styles.loggedText}>Logged</Text>
                      ) : (
                        <View style={styles.logPill}>
                          <Icon name="plus" size={13} color={COLORS.primary} strokeWidth={2.4} />
                          <Text style={styles.logPillText}>Log</Text>
                        </View>
                      )}
                    </Pressable>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Detail */}
      <Sheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={selected ? `${selected.kind === 'plant' ? 'Plant' : 'Animal'} · ${rarityLabel(selected)}` : undefined}
      >
        {selected ? (
          <View style={{ gap: SPACING.md }}>
            {hasLogged(selected.id) ? (
              <Card tone="sunken" style={styles.foundBanner}>
                <Icon name="check-circle" size={18} color={COLORS.primary} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.foundTitle}>Logged</Text>
                  {lastSeen(selected.id) ? (
                    <Text style={styles.foundDate}>
                      {new Date(lastSeen(selected.id)!).toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ) : null}

            <View>
              <Text style={styles.detailSection}>Where to look</Text>
              <View style={{ gap: SPACING.sm }}>
                {trailsForSpecies(selected.id).map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      setSelected(null);
                      navigation.navigate('Trails', { focusTrailId: t.id });
                    }}
                    style={styles.trailRow}
                  >
                    <Icon name="map-pin" size={15} color={COLORS.primary} strokeWidth={2} />
                    <Text style={styles.trailName} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Icon name="chevron-right" size={15} color={COLORS.textLight} />
                  </Pressable>
                ))}
              </View>
            </View>

            <Divider />

            {hasLogged(selected.id) ? (
              <Button
                label="Remove from checklist"
                variant="ghost"
                tone={COLORS.textMuted}
                full
                onPress={async () => {
                  await removeSighting(selected.id);
                  setSelected(null);
                }}
              />
            ) : (
              <Button
                label="I spotted this"
                icon="check"
                full
                onPress={async () => {
                  await handleLog(selected);
                  setSelected(null);
                }}
              />
            )}

            <Text style={styles.honourNote}>
              This is on your honour, like the weekly challenges. Each species counts once.
            </Text>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function SplitCount({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  return (
    <View style={styles.splitCount}>
      <Icon name={icon} size={14} color={COLORS.textMuted} strokeWidth={1.9} />
      <Text style={styles.splitValue}>{value}</Text>
      <Text style={styles.splitLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

  progressTop: { flexDirection: 'row', alignItems: 'center' },
  progressValue: { fontSize: 34, fontWeight: '700', color: COLORS.text, letterSpacing: -0.45 },
  progressTotal: { fontSize: 20, color: COLORS.textLight, fontWeight: '600' },
  progressLabel: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  progressHint: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 6 },
  splitCounts: { gap: 6 },
  splitCount: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  splitValue: { ...TYPOGRAPHY.h4, color: COLORS.text },
  splitLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },

  hereCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md,
    padding: SPACING.md - 3,
  },
  hereIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hereTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  hereSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md - 4,
    height: 44,
  },
  searchInput: { flex: 1, ...TYPOGRAPHY.body, color: COLORS.text, paddingVertical: 0 },

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

  list: { gap: SPACING.sm },
  listTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  cellFull: { width: '100%' },
  cellHalf: { width: '50%', padding: SPACING.xs },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
  },
  rowFound: { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primaryGlow },
  rowFlash: { borderColor: COLORS.primary, borderWidth: 2 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconFound: { backgroundColor: COLORS.primary },
  rowName: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  rowNameFound: { color: COLORS.primary },
  rowMeta: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, marginTop: 2 },
  logButton: { paddingLeft: SPACING.sm },
  logPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySurface,
  },
  logPillText: { ...TYPOGRAPHY.micro, color: COLORS.primary, fontWeight: '700' },
  loggedText: { ...TYPOGRAPHY.micro, color: COLORS.primary, fontWeight: '600' },

  foundBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  foundTitle: { ...TYPOGRAPHY.h4, color: COLORS.primary },
  foundDate: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  detailSection: { ...TYPOGRAPHY.overline, color: COLORS.textMuted, marginBottom: SPACING.sm },
  trailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm + 4,
  },
  trailName: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flex: 1 },
  honourNote: { ...TYPOGRAPHY.small, color: COLORS.textMuted, textAlign: 'center' },
});
