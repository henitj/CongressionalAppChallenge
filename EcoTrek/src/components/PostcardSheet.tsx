import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { Button, Sheet } from './ui';
import Icon from './Icon';
import { RADIUS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { shareImage, shareText } from '../services/share';

export type PostcardStat = { value: string; label: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Sheet title, e.g. "Share your tree". */
  title: string;
  /** Big line on the card itself, e.g. "My tree reached Sapling!". */
  headline: string;
  subline?: string;
  stats: PostcardStat[];
  /** Optional visual rendered on the card (tree scene, route sketch…). */
  children?: React.ReactNode;
  shareMessage: string;
};

/**
 * A shareable postcard: a clean, self-contained card that is captured as a
 * real PNG image and handed to the system share sheet. If image capture is
 * unavailable the card still shares as text, and the card itself is designed
 * to screenshot well.
 */
export default function PostcardSheet({
  visible,
  onClose,
  title,
  headline,
  subline,
  stats,
  children,
  shareMessage,
}: Props) {
  const { colors, typography } = useTheme();
  const shotRef = useRef<any>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const shareAsImage = async () => {
    if (busy) return;
    setBusy(true);
    setNote('');
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 0.95, result: 'tmpfile' });
      const ok = await shareImage(uri, shareMessage, title);
      setNote(ok ? 'Shared!' : 'Could not share the image — try Share as text.');
    } catch {
      setNote('Image sharing is not available here — try Share as text, or screenshot the card.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle="Share it anywhere — no EcoTrek account needed to see it">
      <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.95 }}>
        <View style={[styles.card, { backgroundColor: colors.primaryDark }]}>
          <View style={styles.brandRow}>
            <Icon name="tree" size={20} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.brand}>EcoTrek</Text>
          </View>
          <Text style={styles.headline}>{headline}</Text>
          {subline ? <Text style={styles.subline}>{subline}</Text> : null}
          {children ? <View style={styles.visual}>{children}</View> : null}
          <View style={styles.stats}>
            {stats.slice(0, 4).map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue} numberOfLines={1}>{s.value}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ViewShot>
      <View style={{ gap: SPACING.sm, marginTop: SPACING.md }}>
        <Button label="Share as image" icon="share" full size="lg" loading={busy} onPress={shareAsImage} />
        <Button label="Share as text" variant="secondary" full onPress={() => shareText(shareMessage, title)} />
        {note ? (
          <Text style={[typography.small, { color: colors.textMuted, textAlign: 'center' }]} accessibilityLiveRegion="polite">
            {note}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.sm, overflow: 'hidden' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brand: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.4 },
  headline: { color: '#FFFFFF', fontWeight: '800', fontSize: 24, lineHeight: 30 },
  subline: { color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 20 },
  visual: { borderRadius: RADIUS.lg, overflow: 'hidden', marginVertical: SPACING.xs },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.xs },
  stat: { flexGrow: 1, flexBasis: '40%' },
  statValue: { color: '#FFFFFF', fontWeight: '800', fontSize: 20 },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
});
