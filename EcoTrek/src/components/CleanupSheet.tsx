import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import Icon from './Icon';
import { Sheet, Button } from './ui';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useLogbook } from '../context/LogbookContext';
import { useApp } from '../context/AppContext';
import { detectCurrentTrail } from '../services/trailDetection';

const PRESETS = [3, 5, 10, 25];

/**
 * Logs a trail cleanup.
 *
 * Deliberately the smallest possible feature: how many pieces, tap done. It is
 * self-reported, the same as the manual weekly challenges — the goal is to
 * nudge someone into bending down on the way past, not to audit them.
 */
export default function CleanupSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { logCleanup } = useLogbook();
  const { coords, trails } = useApp();

  const [pieces, setPieces] = useState(5);
  const [saving, setSaving] = useState(false);

  const trail = detectCurrentTrail(
    coords ? { ...coords, timestamp: Date.now() } : undefined,
    trails.length ? trails : undefined
  );

  const submit = async () => {
    if (pieces < 1) return;
    setSaving(true);
    try {
      await logCleanup(pieces, trail?.id ?? null);
      setPieces(5);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Log a cleanup"
      subtitle={trail ? `On the ${trail.name}` : 'Every piece counts'}
    >
      <View style={{ gap: SPACING.md }}>
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>How many pieces did you pick up?</Text>
          <View style={styles.presets}>
            {PRESETS.map((n) => (
              <Pressable
                key={n}
                onPress={() => setPieces(n)}
                style={[styles.chip, pieces === n && styles.chipOn]}
              >
                <Text style={[styles.chipText, pieces === n && styles.chipTextOn]}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={String(pieces)}
            onChangeText={(t) => setPieces(Number(t.replace(/[^0-9]/g, '')) || 0)}
            keyboardType="number-pad"
            maxLength={3}
            style={styles.input}
            accessibilityLabel="Number of pieces collected"
          />
        </View>

        <View style={styles.note}>
          <Icon name="info" size={15} color={COLORS.textMuted} strokeWidth={1.9} />
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
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  presets: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { ...TYPOGRAPHY.h4, color: COLORS.textSecondary },
  chipTextOn: { color: '#fff' },
  input: {
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    textAlign: 'center',
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  note: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  noteText: { ...TYPOGRAPHY.small, color: COLORS.textMuted, flex: 1 },
});
