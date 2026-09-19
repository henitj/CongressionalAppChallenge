import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import Icon from './Icon';
import { Sheet, Button } from './ui';
import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { useLogbook } from '../context/LogbookContext';
import { useApp } from '../context/AppContext';
import { detectCurrentTrail } from '../services/trailDetection';
import { useTheme, Typography } from '../context/ThemeContext';
import { MAX_CLEANUP_PIECES, normalizeCleanupPieces } from '../services/cleanup';

const PRESETS = [1, 10, 50, MAX_CLEANUP_PIECES];

/**
 * Logs a trail cleanup.
 *
 * Deliberately the smallest possible feature: how many pieces, tap done. It is
 * self-reported, the same as the manual weekly challenges — the goal is to
 * nudge someone into bending down on the way past, not to audit them.
 *
 * It is used in two places: the Impact screen (log one any time) and the end
 * of every valid trail, where `allowNone` adds a "None this time" answer so
 * the question is never a dead end.
 */
export default function CleanupSheet({
  visible,
  onClose,
  title = 'Log a cleanup',
  subtitle,
  allowNone = false,
  onLogged,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Shows a "None today" answer — used for the post-walk question. */
  allowNone?: boolean;
  /** Called with the count after it is saved, so the caller can add rewards. */
  onLogged?: (pieces: number) => void | Promise<void>;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { addCleanup } = useLogbook();
  const { coords, trails } = useApp();

  const [pieces, setPieces] = useState(0);
  const [saving, setSaving] = useState(false);

  // Every time the question comes back it should start fresh.
  useEffect(() => {
    if (visible) setPieces(0);
  }, [visible]);

  const trail = detectCurrentTrail(
    coords ? { ...coords, timestamp: Date.now() } : undefined,
    trails.length ? trails : undefined
  );

  const submit = async () => {
    const count = normalizeCleanupPieces(pieces);
    if (count < 1) return;
    setSaving(true);
    try {
      await addCleanup(count);
      await onLogged?.(count);
      setPieces(0);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle ?? (trail ? `On the ${trail.name}` : 'Every piece counts')}
    >
      <View style={{ gap: SPACING.md }}>
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>How many pieces did you pick up?</Text>
          <Text style={styles.policy}>Honesty policy · enter 0 to 99. More pieces earn more points for your club.</Text>
          <View style={styles.presets}>
            {PRESETS.map((n) => (
              <Pressable
                key={n}
                onPress={() => setPieces(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n} pieces`}
                style={[styles.chip, pieces === n && styles.chipOn]}
              >
                <Text style={[styles.chipText, pieces === n && styles.chipTextOn]}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={String(pieces)}
            onChangeText={(t) => setPieces(normalizeCleanupPieces(t.replace(/[^0-9]/g, '')))}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0–99"
            placeholderTextColor={colors.textLight}
            style={styles.input}
            accessibilityLabel="Number of pieces collected, 0 to 99"
          />
        </View>

        <View style={styles.note}>
          <Icon name="info" size={15} color={colors.textMuted} strokeWidth={1.9} />
          <Text style={styles.noteText}>
            On your honour, like the weekly challenges. Wash your hands, and never pick up anything
            sharp or a needle — report those to the park instead.
          </Text>
        </View>

        <Button
          label={`Log ${pieces} piece${pieces === 1 ? '' : 's'}`}
          icon="check"
          full
          loading={saving}
          disabled={pieces < 1}
          onPress={submit}
        />

        {allowNone ? (
          <Button label="None this time" variant="ghost" full disabled={saving} onPress={onClose} />
        ) : null}
      </View>
    </Sheet>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  label: { ...t.overline, color: c.textMuted },
  policy: { ...t.small, color: c.textSecondary },
  presets: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { ...t.h4, color: c.textSecondary },
  chipTextOn: { color: '#fff' },
  input: {
    backgroundColor: c.surfaceSunken,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 12,
    textAlign: 'center',
    ...t.h3,
    color: c.text,
  },
  note: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  noteText: { ...t.small, color: c.textMuted, flex: 1 },

  });
}
