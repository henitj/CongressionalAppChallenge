import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { IconName } from '../components/Icon';
import { LEVELS } from './theme';
import { useAuth } from '../context/AuthContext';
import { keyFor, loadJSON, saveJSON } from '../services/storage';
import { api, isBackendConfigured, ROUTES } from '../services/api';

export type EcoAction =
  | 'hike_mile'
  | 'bike_mile'
  | 'tree_earned'
  | 'plant_identified'
  | 'photo_uploaded'
  | 'trail_completed'
  | 'cleanup'
  | 'challenge_completed'
  | 'club_joined'
  | 'daily_login'
  | 'streak_bonus';

export type PointEvent = {
  id: string;
  action: EcoAction;
  points: number;
  label: string;
  timestamp: number;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  unlocked: boolean;
  unlockedAt?: number;
};

/** Stats the badge engine needs but doesn't own. Fed in by other contexts. */
export type BadgeInputs = {
  totalMiles: number;
  totalTrees: number;
  totalActivities: number;
  hikes: number;
  rides: number;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  activeDaysLast30: number;
  perfectWeeks: number;
  hadComeback: boolean;
  trailsCompleted: number;
  challengesCompleted: number;
  clubsJoined: number;
  clubsFounded: number;
};

type EcoPointsState = {
  totalPoints: number;
  level: string;
  levelIndex: number;
  nextLevelPoints: number;
  currentLevelPoints: number;
  progressPercent: number;
  history: PointEvent[];
  badges: Badge[];
  unlockedBadges: Badge[];
  /** Fixed-value award, e.g. award('daily_login'). */
  award: (action: EcoAction, opts?: { points?: number; label?: string; multiplier?: number }) => Promise<number>;
  /** Back-compat alias used by older screens. */
  addPoints: (action: EcoAction, multiplier?: number) => Promise<number>;
  refreshBadges: (inputs: BadgeInputs) => void;
  pointsSince: (timestamp: number) => number;
  resetPoints: () => Promise<void>;
};

export const POINT_VALUES: Record<EcoAction, number> = {
  hike_mile: 5,
  bike_mile: 3,
  tree_earned: 8,
  plant_identified: 2,
  photo_uploaded: 1,
  trail_completed: 25,
  cleanup: 15,
  challenge_completed: 25,
  club_joined: 5,
  daily_login: 2,
  streak_bonus: 10,
};

export const ACTION_LABELS: Record<EcoAction, string> = {
  hike_mile: 'Hiked a mile',
  bike_mile: 'Biked a mile',
  tree_earned: 'Tree earned',
  plant_identified: 'Plant identified',
  photo_uploaded: 'Photo uploaded',
  trail_completed: 'Trail completed',
  cleanup: 'Trail cleanup',
  challenge_completed: 'Challenge completed',
  club_joined: 'Joined a club',
  daily_login: 'Daily check-in',
  streak_bonus: 'Streak bonus',
};

function getLevel(points: number) {
  let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].min) {
      idx = i;
      break;
    }
  }
  const prev = LEVELS[idx].min;
  const next = LEVELS[idx + 1]?.min ?? prev + 25000;
  const progress = Math.min(((points - prev) / (next - prev)) * 100, 100);
  return {
    level: LEVELS[idx].name,
    levelIndex: idx,
    currentLevelPoints: prev,
    nextLevelPoints: next,
    progressPercent: progress,
  };
}

const DEFAULT_BADGES: Badge[] = [
  // ── Getting started ──────────────────────────────────────────────────────
  { id: 'first_hike', name: 'First Steps', description: 'Complete your first hike', icon: 'boot', unlocked: false },
  { id: 'first_ride', name: 'Wheels Up', description: 'Complete your first bike ride', icon: 'bike', unlocked: false },
  { id: 'first_tree', name: 'Seed Planter', description: 'Earn your first tree', icon: 'leaf', unlocked: false },

  // ── Distance ─────────────────────────────────────────────────────────────
  { id: 'five_miles', name: 'Five Miler', description: 'Cover 5 total miles', icon: 'activity', unlocked: false },
  { id: 'twenty_five_miles', name: 'Distance Runner', description: 'Cover 25 total miles', icon: 'trending-up', unlocked: false },
  { id: 'hundred_miles', name: 'Century Trekker', description: 'Cover 100 total miles', icon: 'award', unlocked: false },
  { id: 'ten_trees', name: 'Mini Forest', description: 'Earn 10 trees', icon: 'tree', unlocked: false },
  { id: 'fifty_trees', name: 'Grove Keeper', description: 'Earn 50 trees', icon: 'tree', unlocked: false },

  // ── Streaks ──────────────────────────────────────────────────────────────
  { id: 'streak_3', name: 'Warming Up', description: 'Reach a 3-day streak', icon: 'flame', unlocked: false },
  { id: 'streak_7', name: 'Seven Straight', description: 'Reach a 7-day streak', icon: 'flame', unlocked: false },
  { id: 'streak_14', name: 'Two Weeks Deep', description: 'Reach a 14-day streak', icon: 'flame', unlocked: false },
  { id: 'streak_30', name: 'Unbroken', description: 'Reach a 30-day streak', icon: 'flame', unlocked: false },
  { id: 'streak_60', name: 'Two Month Machine', description: 'Reach a 60-day streak', icon: 'flame', unlocked: false },
  { id: 'streak_100', name: 'Triple Digits', description: 'Reach a 100-day streak', icon: 'flame', unlocked: false },
  { id: 'streak_365', name: 'Year of Trails', description: 'Reach a 365-day streak', icon: 'crown', unlocked: false },
  { id: 'perfect_week', name: 'Perfect Week', description: 'Log an activity all seven days of one week', icon: 'calendar', unlocked: false },
  { id: 'perfect_weeks_4', name: 'Four Perfect Weeks', description: 'Log four flawless weeks in total', icon: 'calendar', unlocked: false },
  { id: 'month_20', name: 'Twenty in Thirty', description: 'Get out on 20 days within a single month', icon: 'target', unlocked: false },
  { id: 'comeback', name: 'Comeback', description: 'Lose a 7-day streak and build a new one', icon: 'refresh', unlocked: false },
  { id: 'hundred_days', name: 'Hundred Days Out', description: 'Log activities on 100 separate days', icon: 'award', unlocked: false },

  // ── Challenges, trails, clubs ────────────────────────────────────────────
  { id: 'first_challenge', name: 'Challenger', description: 'Finish your first weekly challenge', icon: 'target', unlocked: false },
  { id: 'ten_challenges', name: 'Habit Builder', description: 'Finish 10 challenges', icon: 'target', unlocked: false },
  { id: 'fifty_challenges', name: 'Relentless', description: 'Finish 50 challenges', icon: 'zap', unlocked: false },
  { id: 'first_trail', name: 'Trail Bagger', description: 'Complete a full named trail', icon: 'map', unlocked: false },
  { id: 'five_trails', name: 'Trail Master', description: 'Complete 5 different trails', icon: 'flag', unlocked: false },
  { id: 'five_hundred_points', name: 'Point Collector', description: 'Earn 500 EcoPoints', icon: 'star', unlocked: false },
  { id: 'thousand_points', name: 'EcoElite', description: 'Earn 1,000 EcoPoints', icon: 'star', unlocked: false },
  { id: 'trail_steward', name: 'Trail Steward', description: 'Reach the Trail Steward level', icon: 'shield', unlocked: false },
  { id: 'eco_champion', name: 'EcoChampion', description: 'Reach the EcoChampion level', icon: 'crown', unlocked: false },
  { id: 'club_member', name: 'Team Player', description: 'Join a club', icon: 'users', unlocked: false },
  { id: 'club_founder', name: 'Club Founder', description: 'Create a club', icon: 'crown', unlocked: false },
];

const EcoPointsContext = createContext<EcoPointsState | null>(null);

export function EcoPointsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [history, setHistory] = useState<PointEvent[]>([]);
  const [badges, setBadges] = useState<Badge[]>(DEFAULT_BADGES);
  const [loaded, setLoaded] = useState(false);

  const histKey = keyFor(userId, 'points');
  const badgeKey = keyFor(userId, 'badges');

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const [h, b] = await Promise.all([
        loadJSON<PointEvent[]>(histKey, []),
        loadJSON<Badge[]>(badgeKey, DEFAULT_BADGES),
      ]);
      if (cancelled) return;

      // Merge in any badges added by an app update.
      const merged = DEFAULT_BADGES.map((d) => b.find((x) => x.id === d.id) ?? d);

      setHistory(h);
      setBadges(merged);
      setLoaded(true);

      if (isBackendConfigured()) {
        const res = await api.get<PointEvent[]>(ROUTES.points);
        if (!cancelled && res.ok && Array.isArray(res.data)) {
          setHistory(res.data);
          saveJSON(histKey, res.data);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [histKey, badgeKey]);

  const totalPoints = useMemo(
    () => history.reduce((sum, e) => sum + e.points, 0),
    [history]
  );

  const award = useCallback<EcoPointsState['award']>(
    async (action, opts = {}) => {
      const base = opts.points ?? POINT_VALUES[action];
      const pts = Math.round(base * (opts.multiplier ?? 1));
      if (pts === 0) return 0;

      const event: PointEvent = {
        id: `${Date.now()}-${action}-${Math.random().toString(36).slice(2, 7)}`,
        action,
        points: pts,
        label: opts.label ?? ACTION_LABELS[action],
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const updated = [event, ...prev].slice(0, 1000);
        saveJSON(histKey, updated);
        return updated;
      });

      if (isBackendConfigured()) {
        api.post(ROUTES.points, event);
      }

      return pts;
    },
    [histKey]
  );

  const addPoints = useCallback(
    (action: EcoAction, multiplier = 1) => award(action, { multiplier }),
    [award]
  );

  const refreshBadges = useCallback(
    (inputs: BadgeInputs) => {
      setBadges((current) => {
        const { levelIndex } = getLevel(totalPoints);
        const rules: Record<string, boolean> = {
          first_hike: inputs.hikes >= 1,
          first_ride: inputs.rides >= 1,
          first_tree: inputs.totalTrees >= 1,
          five_miles: inputs.totalMiles >= 5,
          twenty_five_miles: inputs.totalMiles >= 25,
          hundred_miles: inputs.totalMiles >= 100,
          ten_trees: inputs.totalTrees >= 10,
          fifty_trees: inputs.totalTrees >= 50,
          streak_3: inputs.longestStreak >= 3,
          streak_7: inputs.longestStreak >= 7,
          streak_14: inputs.longestStreak >= 14,
          streak_30: inputs.longestStreak >= 30,
          streak_60: inputs.longestStreak >= 60,
          streak_100: inputs.longestStreak >= 100,
          streak_365: inputs.longestStreak >= 365,
          perfect_week: inputs.perfectWeeks >= 1,
          perfect_weeks_4: inputs.perfectWeeks >= 4,
          month_20: inputs.activeDaysLast30 >= 20,
          comeback: inputs.hadComeback,
          hundred_days: inputs.totalActiveDays >= 100,
          first_challenge: inputs.challengesCompleted >= 1,
          ten_challenges: inputs.challengesCompleted >= 10,
          fifty_challenges: inputs.challengesCompleted >= 50,
          first_trail: inputs.trailsCompleted >= 1,
          five_trails: inputs.trailsCompleted >= 5,
          five_hundred_points: totalPoints >= 500,
          thousand_points: totalPoints >= 1000,
          trail_steward: levelIndex >= 4,
          eco_champion: levelIndex >= 7,
          club_member: inputs.clubsJoined >= 1,
          club_founder: inputs.clubsFounded >= 1,
        };

        let changed = false;
        const next = current.map((b) => {
          if (!b.unlocked && rules[b.id]) {
            changed = true;
            return { ...b, unlocked: true, unlockedAt: Date.now() };
          }
          return b;
        });

        if (changed) saveJSON(badgeKey, next);
        return changed ? next : current;
      });
    },
    [badgeKey, totalPoints]
  );

  const pointsSince = useCallback(
    (timestamp: number) =>
      history.reduce((sum, e) => (e.timestamp >= timestamp ? sum + e.points : sum), 0),
    [history]
  );

  const resetPoints = useCallback(async () => {
    setHistory([]);
    setBadges(DEFAULT_BADGES);
    await Promise.all([saveJSON(histKey, []), saveJSON(badgeKey, DEFAULT_BADGES)]);
  }, [histKey, badgeKey]);

  const levelInfo = useMemo(() => getLevel(totalPoints), [totalPoints]);
  const unlockedBadges = useMemo(() => badges.filter((b) => b.unlocked), [badges]);

  const value = useMemo<EcoPointsState>(
    () => ({
      totalPoints,
      history,
      badges,
      unlockedBadges,
      award,
      addPoints,
      refreshBadges,
      pointsSince,
      resetPoints,
      ...levelInfo,
    }),
    [
      totalPoints,
      history,
      badges,
      unlockedBadges,
      award,
      addPoints,
      refreshBadges,
      pointsSince,
      resetPoints,
      levelInfo,
    ]
  );

  if (!loaded) return null;

  return <EcoPointsContext.Provider value={value}>{children}</EcoPointsContext.Provider>;
}

export function useEcoPoints() {
  const ctx = useContext(EcoPointsContext);
  if (!ctx) throw new Error('useEcoPoints must be used inside <EcoPointsProvider />');
  return ctx;
}
