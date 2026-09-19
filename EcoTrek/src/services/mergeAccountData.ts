/** Non-destructive guest upgrade. Existing account preferences win; logs are unioned by ID. */
export function mergeAccountData(name: string, source: any, destination: any): any {
  if (destination == null) return source;
  if (Array.isArray(source) && Array.isArray(destination)) {
    const items = new Map<string, any>();
    for (const item of [...source, ...destination]) {
      const id = item?.id ?? JSON.stringify(item);
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
    if (name === 'user_profile') {
      const result = { ...source, ...destination };
      for (const key of ['firstName', 'lastName', 'age', 'heightInches', 'weightPounds', 'stepLengthInches', 'createdAt', 'avatarUri']) {
        if (!result[key]) result[key] = source[key];
      }
      result.weightHistory = [...new Map([...(source.weightHistory ?? []), ...(destination.weightHistory ?? [])].map((h: any) => [h.date, h])).values()];
      return result;
    }
    if (name === 'streak') {
      const weeks = { ...source.weeks };
      for (const [key, value] of Object.entries(destination.weeks ?? {}) as [string, any][]) {
        const old = weeks[key];
        weeks[key] = { ...old, ...value, active: !!(old?.active || value.active), frozen: !!(old?.frozen || value.frozen),
          activities: Math.max(old?.activities ?? 0, value.activities ?? 0), miles: Math.max(old?.miles ?? 0, value.miles ?? 0) };
      }
      const freezes = new Map<number, any>();
      for (const f of [...(source.freezes ?? []), ...(destination.freezes ?? [])]) {
        const old = freezes.get(f.earnedAt);
        freezes.set(f.earnedAt, old?.usedAt ? old : f);
      }
      return { ...source, ...destination, weeks,
        longestStreak: Math.max(source.longestStreak ?? 0, destination.longestStreak ?? 0),
        freezes: [...freezes.values()].filter((f) => f.usedAt != null).concat([...freezes.values()].filter((f) => f.usedAt == null).slice(0, 4)),
        rewardedWeeks: [...new Set([...(source.rewardedWeeks ?? []), ...(destination.rewardedWeeks ?? [])])],
        activityIds: [...new Set([...(source.activityIds ?? []), ...(destination.activityIds ?? [])])],
        days: { ...source.days, ...destination.days },
      };
    }
  }
  return destination;
}
