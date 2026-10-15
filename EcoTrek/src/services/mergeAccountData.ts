/** Non-destructive guest upgrade. Existing account preferences win; logs are unioned by ID. */
export function mergeAccountData(name: string, source: any, destination: any): any {
  if (destination == null) return source;
  if (source == null) return destination;
  if (Array.isArray(source) && Array.isArray(destination)) {
    const items = new Map<string, any>();
    for (const item of [...source, ...destination]) {
      if (!item) continue;
      const id = item.id != null ? String(item.id) : JSON.stringify(item) || `${Math.random()}`;
      const previous = items.get(id);
      items.set(id, name === 'badges' && previous ? {
        ...previous, ...item,
        unlocked: !!(previous.unlocked || item.unlocked),
        unlockedAt: item.unlockedAt ?? previous.unlockedAt,
        claimedAt: item.claimedAt ?? previous.claimedAt,
      } : item);
    }
    return [...items.values()].sort((a, b) => (b.startedAt ?? b.timestamp ?? b.date ?? 0) - (a.startedAt ?? a.timestamp ?? a.date ?? 0));
  }
  if (source && destination && typeof source === 'object' && typeof destination === 'object') {
    if (name === 'trail-ratings') return { ...source, ...destination };
    if (name === 'tree-growth' && ([2, 3].includes(source.version) || [2, 3].includes(destination.version))) {
      const v2 = [2, 3].includes(source.version) ? source : destination;
      const other = [2, 3].includes(source.version) && [2, 3].includes(destination.version) ? destination : {};
      const union = (field: string) => [...new Set([...(Array.isArray(v2[field]) ? v2[field] : []), ...(Array.isArray(other[field]) ? other[field] : [])])].sort();
      const validTime = (value: any) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : Infinity;
      const current = (other.careWeek ?? '') > (v2.careWeek ?? '') ? other : v2;
      const care = { ...current.care };
      if (v2.careWeek === other.careWeek) for (const kind of ['water', 'sun', 'nutrients']) care[kind] = Math.max(v2.care?.[kind] ?? 0, other.care?.[kind] ?? 0);
      const harvestedWeeks = union('harvestedWeeks');
      const careHistory: Record<string, any> = {};
      for (const tree of [v2, other]) {
        for (const week of tree.careWeeks ?? []) careHistory[week] = { water: 1, sun: 1, nutrients: 1 };
        for (const [week, value] of Object.entries(tree.careHistory ?? {}) as [string, any][]) {
          const old = careHistory[week] ?? {};
          careHistory[week] = { water: Math.max(old.water ?? 0, value?.water ?? 0), sun: Math.max(old.sun ?? 0, value?.sun ?? 0), nutrients: Math.max(old.nutrients ?? 0, value?.nutrients ?? 0) };
        }
      }
      return { ...v2, ...other, version: 3, careHistory,
        plantedAt: Math.min(validTime(v2.plantedAt), validTime(other.plantedAt)),
        lastSeenAt: Math.max(v2.lastSeenAt ?? 0, other.lastSeenAt ?? 0),
        careWeek: current.careWeek, care, careWeeks: union('careWeeks'), outdoorWeeks: union('outdoorWeeks'), harvestedWeeks,
        forest: Math.max(source.forest ?? 0, destination.forest ?? 0),
        goldenApples: Math.max(v2.goldenApples ?? 0, other.goldenApples ?? 0, harvestedWeeks.length),
      };
    }
    if (name === 'user_profile') {
      const result = { ...source, ...destination };
      for (const key of ['firstName', 'lastName', 'age', 'heightInches', 'weightPounds', 'stepLengthInches', 'createdAt', 'avatarUri']) {
        if (!result[key]) result[key] = source[key];
      }
      const rawWeights = [...(Array.isArray(source.weightHistory) ? source.weightHistory : []), ...(Array.isArray(destination.weightHistory) ? destination.weightHistory : [])].filter((h) => h && h.date != null);
      result.weightHistory = [...new Map(rawWeights.map((h: any) => [h.date, h])).values()];
      return result;
    }
    if (name === 'streak') {
      const weeks = { ...(source.weeks ?? {}) };
      for (const [key, value] of Object.entries(destination.weeks ?? {}) as [string, any][]) {
        const old = weeks[key];
        weeks[key] = { ...old, ...value, active: !!(old?.active || value?.active), frozen: !!(old?.frozen || value?.frozen),
          activities: Math.max(old?.activities ?? 0, value?.activities ?? 0), miles: Math.max(old?.miles ?? 0, value?.miles ?? 0) };
      }
      const freezes = new Map<number, any>();
      const rawFreezes = [...(Array.isArray(source.freezes) ? source.freezes : []), ...(Array.isArray(destination.freezes) ? destination.freezes : [])].filter((f) => f && f.earnedAt != null);
      for (const f of rawFreezes) {
        const old = freezes.get(f.earnedAt);
        freezes.set(f.earnedAt, old?.usedAt ? old : f);
      }
      return { ...source, ...destination, weeks,
        longestStreak: Math.max(source.longestStreak ?? 0, destination.longestStreak ?? 0),
        freezes: [...freezes.values()].filter((f) => f.usedAt != null).concat([...freezes.values()].filter((f) => f.usedAt == null).slice(0, 4)),
        rewardedWeeks: [...new Set([...(Array.isArray(source.rewardedWeeks) ? source.rewardedWeeks : []), ...(Array.isArray(destination.rewardedWeeks) ? destination.rewardedWeeks : [])])],
        activityIds: [...new Set([...(Array.isArray(source.activityIds) ? source.activityIds : []), ...(Array.isArray(destination.activityIds) ? destination.activityIds : [])])],
        days: { ...(source.days ?? {}), ...(destination.days ?? {}) },
      };
    }
  }
  return destination;
}
