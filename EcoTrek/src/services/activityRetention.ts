export const ACTIVITY_RETENTION_DAYS = 365;

export function retainRecentActivities<T extends { startedAt: number }>(
  activities: T[],
  now = Date.now()
): T[] {
  const cutoff = now - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return activities.filter((activity) => Number.isFinite(activity.startedAt) && activity.startedAt >= cutoff);
}
