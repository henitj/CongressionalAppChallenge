import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Button, Card } from './ui';
import { SPACING } from '../constants/theme';
import { AUSTIN_TRAILS } from '../constants/austinTrails';
import { useActivity } from '../context/ActivityContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useOptionalTreeGrowth } from '../context/TreeGrowthContext';
import { useTheme } from '../context/ThemeContext';
import {
  buildDemoTrailCompletion,
  buildDemoWalk,
  buildDeveloperSeedHistory,
  isDeveloperProfile,
} from '../services/developerMode';
import { keyFor, loadJSON, saveJSON } from '../services/storage';

/**
 * Developer/demo controls. Rendered ONLY for a developer account (exact
 * secret name — see services/developerMode); returns null for everyone else.
 * Lets a demo presenter instantly log miles, complete trails, load a
 * pre-done Austin history and grow the tree at their own pace.
 */
export default function DeveloperModePanel() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { profile } = useProfile();
  const { user } = useAuth();
  const { addActivity, history, loading } = useActivity();
  const tree = useOptionalTreeGrowth();
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const seedingRef = useRef(false);

  const developer = isDeveloperProfile(profile);
  const seedKey = keyFor(user?.id ?? null, 'developer_seeded');

  // First developer session: pre-load the Austin history automatically.
  useEffect(() => {
    if (!developer || loading || seedingRef.current) return;
    seedingRef.current = true;
    (async () => {
      const seeded = await loadJSON<boolean>(seedKey, false);
      if (seeded || history.length > 0) {
        await saveJSON(seedKey, true);
        return;
      }
      for (const input of buildDeveloperSeedHistory()) {
        await addActivity(input);
      }
      await saveJSON(seedKey, true);
      setNote('Demo history loaded: 5 Austin trails already walked.');
    })().catch(() => { seedingRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developer, loading]);

  if (!developer) return null;

  const run = async (label: string, fn: () => Promise<string>) => {
    if (busy) return;
    setBusy(label);
    try { setNote(await fn()); } finally { setBusy(''); }
  };

  const demoTrails = ['lady-bird-lake', 'barton-creek', 'walnut-creek', 'mckinney-falls']
    .map((id) => AUSTIN_TRAILS.find((t) => t.id === id))
    .filter(Boolean) as typeof AUSTIN_TRAILS;

  return (
    <Card tone="sunken" style={styles.panel}>
      <Text style={styles.title}>🛠 Developer mode</Text>
      <Text style={styles.body}>
        Demo controls for this account only. Age {profile.age} · step length {profile.stepLengthInches} in.
      </Text>

      <Text style={styles.section}>Instantly log a walk</Text>
      <View style={styles.row}>
        {[1, 3, 5, 10].map((miles) => (
          <Button
            key={miles}
            label={`+${miles} mi`}
            size="sm"
            variant="secondary"
            loading={busy === `walk-${miles}`}
            onPress={() => run(`walk-${miles}`, async () => {
              const result = await addActivity(buildDemoWalk(miles, Date.now() - Math.round(miles / 3 * 3600000)));
              return result.rejected ? 'That walk was rejected — try again.' : `Logged a ${miles}-mile walk.`;
            })}
          />
        ))}
      </View>

      <Text style={styles.section}>Instantly complete a trail</Text>
      <View style={styles.row}>
        {demoTrails.map((trail) => (
          <Button
            key={trail.id}
            label={trail.name.split('—')[0].split('(')[0].trim()}
            size="sm"
            variant="secondary"
            loading={busy === trail.id}
            onPress={() => run(trail.id, async () => {
              const result = await addActivity(buildDemoTrailCompletion(trail, 0, 9));
              return result.trailCompleted
                ? `Completed ${trail.name}.`
                : `Logged ${trail.name} (${result.activity.miles} mi).`;
            })}
          />
        ))}
      </View>

      <Text style={styles.section}>Grow the tree faster</Text>
      <View style={styles.row}>
        {[4, 12, 26, 52].map((weeks) => (
          <Button
            key={weeks}
            label={`+${weeks} wks`}
            size="sm"
            variant="secondary"
            loading={busy === `tree-${weeks}`}
            onPress={() => run(`tree-${weeks}`, async () => {
              await tree?.developerAdvanceTree(weeks);
              return `Tree advanced ${weeks} weeks.`;
            })}
          />
        ))}
      </View>

      <Button
        label="Load pre-done Austin history"
        icon="check"
        variant="secondary"
        full
        loading={busy === 'seed'}
        onPress={() => run('seed', async () => {
          for (const input of buildDeveloperSeedHistory()) await addActivity(input);
          await saveJSON(seedKey, true);
          return 'Demo history loaded: Lady Bird Lake, Barton Creek, McKinney Falls, Shoal Creek and Mount Bonnell.';
        })}
      />
      {note ? <Text style={styles.note} accessibilityLiveRegion="polite">{note}</Text> : null}
    </Card>
  );
}

function makeStyles(c: any, t: any) {
  return StyleSheet.create({
    panel: { gap: SPACING.sm, borderWidth: 1, borderColor: c.accent, borderStyle: 'dashed' },
    title: { ...t.h3, color: c.text },
    body: { ...t.small, color: c.textSecondary },
    section: { ...t.overline, color: c.textMuted, marginTop: SPACING.xs },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    note: { ...t.smallMed, color: c.primary },
  });
}
