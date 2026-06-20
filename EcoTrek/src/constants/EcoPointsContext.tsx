import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type EcoAction =
  | 'hike_mile'
  | 'bike_mile'
  | 'tree_planted'
  | 'plant_identified'
  | 'photo_uploaded'
  | 'trail_completed'
  | 'cleanup'
  | 'challenge_completed';

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
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
};

type EcoPointsState = {
  totalPoints: number;
  level: string;
  levelIndex: number;
  nextLevelPoints: number;
  progressPercent: number;
  history: PointEvent[];
  badges: Badge[];
  addPoints: (action: EcoAction, multiplier?: number) => Promise<number>;
  resetPoints: () => Promise<void>;
};

const STORAGE_KEY = '@ecotrek/ecopoints';
const BADGES_KEY = '@ecotrek/badges';

// ─── Points per action ────────────────────────────────────────────────────────
export const POINT_VALUES: Record<EcoAction, number> = {
  hike_mile: 10,
  bike_mile: 8,
  tree_planted: 15,
  plant_identified: 5,
  photo_uploaded: 3,
  trail_completed: 20,
  cleanup: 25,
  challenge_completed: 50,
};

export const ACTION_LABELS: Record<EcoAction, string> = {
  hike_mile: 'Hiked a mile',
  bike_mile: 'Biked a mile',
  tree_planted: 'Tree planted',
  plant_identified: 'Plant identified',
  photo_uploaded: 'Photo uploaded',
  trail_completed: 'Trail completed',
  cleanup: 'Cleanup crew',
  challenge_completed: 'Challenge completed',
};

// ─── Levels ───────────────────────────────────────────────────────────────────
const LEVELS = [
  { name: '🥾 New Trekker', min: 0 },
  { name: '🌱 Seedling', min: 50 },
  { name: '🌿 Trail Steward', min: 150 },
  { name: '🌳 Forest Friend', min: 300 },
  { name: '🌲 Forest Guardian', min: 600 },
  { name: '🦅 EcoChampion', min: 1000 },
  { name: '🌍 Earth Defender', min: 2000 },
];

function getLevel(points: number) {
  let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].min) {
      idx = i;
      break;
    }
  }
  const next = LEVELS[idx + 1]?.min ?? LEVELS[idx].min + 1000;
  const prev = LEVELS[idx].min;
  const progress = Math.min(((points - prev) / (next - prev)) * 100, 100);
  return {
    level: LEVELS[idx].name,
    levelIndex: idx,
    nextLevelPoints: next,
    progressPercent: progress,
  };
}

// ─── Default badges ───────────────────────────────────────────────────────────
const DEFAULT_BADGES: Badge[] = [
  {
    id: 'first_hike',
    name: 'First Steps',
    description: 'Complete your first hike',
    icon: '🥾',
    unlocked: false,
  },
  {
    id: 'first_tree',
    name: 'Tree Planter',
    description: 'Plant your first tree',
    icon: '🌱',
    unlocked: false,
  },
  {
    id: 'five_miles',
    name: 'Five Miler',
    description: 'Log 5 total miles',
    icon: '🏃',
    unlocked: false,
  },
  {
    id: 'ten_trees',
    name: 'Mini Forest',
    description: 'Plant 10 trees',
    icon: '🌳',
    unlocked: false,
  },
  {
    id: 'plant_id',
    name: 'Botanist',
    description: 'Identify your first plant',
    icon: '🌿',
    unlocked: false,
  },
  {
    id: 'hundred_points',
    name: 'Century',
    description: 'Earn 100 EcoPoints',
    icon: '💯',
    unlocked: false,
  },
  {
    id: 'trail_steward',
    name: 'Trail Steward',
    description: 'Reach Trail Steward level',
    icon: '🛡️',
    unlocked: false,
  },
  {
    id: 'eco_champion',
    name: 'EcoChampion',
    description: 'Reach EcoChampion level',
    icon: '🦅',
    unlocked: false,
  },
  {
    id: 'cleanup_crew',
    name: 'Cleanup Crew',
    description: 'Log a trail cleanup',
    icon: '🧹',
    unlocked: false,
  },
  {
    id: 'photographer',
    name: 'Nature Photographer',
    description: 'Upload 5 trail photos',
    icon: '📸',
    unlocked: false,
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────
const EcoPointsContext = createContext<EcoPointsState | null>(null);

export function EcoPointsProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<PointEvent[]>([]);
  const [badges, setBadges] = useState<Badge[]>(DEFAULT_BADGES);
  const [loaded, setLoaded] = useState(false);

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const [rawH, rawB] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(BADGES_KEY),
        ]);
        if (rawH) setHistory(JSON.parse(rawH));
        if (rawB) setBadges(JSON.parse(rawB));
      } catch (e) {
        console.warn('EcoPoints load error', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const totalPoints = useMemo(
    () => history.reduce((sum, e) => sum + e.points, 0),
    [history]
  );

  // Badge checker
  const checkBadges = useCallback(
    (
      newHistory: PointEvent[],
      newTotal: number,
      currentBadges: Badge[]
    ): Badge[] => {
      const totalMiles = newHistory
        .filter((e) => e.action === 'hike_mile' || e.action === 'bike_mile')
        .length;
      const treesPlanted = newHistory.filter(
        (e) => e.action === 'tree_planted'
      ).length;
      const plantsId = newHistory.filter(
        (e) => e.action === 'plant_identified'
      ).length;
      const photosUp = newHistory.filter(
        (e) => e.action === 'photo_uploaded'
      ).length;
      const cleanups = newHistory.filter(
        (e) => e.action === 'cleanup'
      ).length;
      const hikes = newHistory.filter(
        (e) => e.action === 'hike_mile'
      ).length;
      const { levelIndex } = getLevel(newTotal);

      const rules: Record<string, boolean> = {
        first_hike: hikes >= 1,
        first_tree: treesPlanted >= 1,
        five_miles: totalMiles >= 5,
        ten_trees: treesPlanted >= 10,
        plant_id: plantsId >= 1,
        hundred_points: newTotal >= 100,
        trail_steward: levelIndex >= 2,
        eco_champion: levelIndex >= 5,
        cleanup_crew: cleanups >= 1,
        photographer: photosUp >= 5,
      };

      return currentBadges.map((b) => {
        if (!b.unlocked && rules[b.id]) {
          return { ...b, unlocked: true, unlockedAt: Date.now() };
        }
        return b;
      });
    },
    []
  );

  const addPoints = useCallback(
    async (action: EcoAction, multiplier = 1): Promise<number> => {
      const pts = POINT_VALUES[action] * multiplier;
      const event: PointEvent = {
        id: `${Date.now()}-${action}`,
        action,
        points: pts,
        label: ACTION_LABELS[action],
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const updated = [event, ...prev];
        const newTotal = updated.reduce((s, e) => s + e.points, 0);
        const updatedBadges = checkBadges(updated, newTotal, badges);

        // Persist both
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(
          console.warn
        );
        AsyncStorage.setItem(BADGES_KEY, JSON.stringify(updatedBadges)).catch(
          console.warn
        );

        setBadges(updatedBadges);
        return updated;
      });

      return pts;
    },
    [badges, checkBadges]
  );

  const resetPoints = useCallback(async () => {
    setHistory([]);
    setBadges(DEFAULT_BADGES);
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY),
      AsyncStorage.removeItem(BADGES_KEY),
    ]);
  }, []);

  const levelInfo = useMemo(() => getLevel(totalPoints), [totalPoints]);

  const value: EcoPointsState = useMemo(
    () => ({
      totalPoints,
      history,
      badges,
      addPoints,
      resetPoints,
      ...levelInfo,
    }),
    [totalPoints, history, badges, addPoints, resetPoints, levelInfo]
  );

  if (!loaded) return null;

  return (
    <EcoPointsContext.Provider value={value}>
      {children}
    </EcoPointsContext.Provider>
  );
}

export function useEcoPoints() {
  const ctx = useContext(EcoPointsContext);
  if (!ctx)
    throw new Error('useEcoPoints must be used inside <EcoPointsProvider />');
  return ctx;
}