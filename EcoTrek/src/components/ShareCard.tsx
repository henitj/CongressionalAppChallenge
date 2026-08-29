import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { Share } from 'react-native';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';

import Icon from './Icon';
import { Avatar, Button, Sheet } from './ui';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { shareText } from '../services/share';

/**
 * RN 0.81's generated typings omit `Share.shareFiles` even though it exists
 * at runtime on iOS and Android (that is how images get attached to the
 * system share sheet). Declare the method locally instead of casting around
 * everywhere.
 */
type ShareWithFiles = typeof Share & {
  shareFiles?(
    files: string[],
    options?: { title?: string; message?: string; mimeType?: string; UTI?: string; dialogTitle?: string }
  ): Promise<{ action: string; urls?: string[] | null }>;
};
const ShareWithFiles = Share as ShareWithFiles;

type Props = {
  visible: boolean;
  onClose: () => void;
  name: string;
  miles: string;
  unit: string;
  trees: number;
  streak: number;
  level: string;
  trails?: number;
  avatarUri?: string | null;
};

/**
 * Share your progress as a PICTURE.
 *
 * The card below the title is the exact image you send: your profile photo
 * (or your initials), your name, and your stats. "Share as picture" captures
 * that card into a PNG and opens the system share sheet with the image
 * attached. If capturing ever fails, it falls back to sharing the same stats
 * as text — so sharing never dead-ends.
 *
 * No sharing at all? The card is right there on screen — show your phone.
 */
export default function ShareCard({
  visible,
  onClose,
  name,
  miles,
  unit,
  trees,
  streak,
  level,
  trails = 0,
  avatarUri,
}: Props) {
  const shotRef = useRef<ViewShotRef>(null);
  const [sharing, setSharing] = useState(false);

  const message =
    `${name} walked ${miles} ${unit} with EcoTrek.\n` +
    `${trees} tree${trees === 1 ? '' : 's'} · ${streak}-week streak · ${level}\n` +
    `Want to join me?`;

  const shareAsPicture = async () => {
    setSharing(true);
    try {
      const ref = shotRef.current;
      if (!ref?.capture) throw new Error('capture unavailable');
      const uri = await ref.capture();

      if (Platform.OS === 'web') {
        await shareOnWeb(uri, message, name);
        return;
      }

      if (!ShareWithFiles.shareFiles) throw new Error('shareFiles unavailable');
      const result = await ShareWithFiles.shareFiles([uri], {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: `Share ${name}'s EcoTrek card`,
      });
      if (result.action === Share.sharedAction && result.urls?.length) {
        Alert.alert('Sent', 'Your picture is on its way.');
      }
    } catch (e) {
      console.warn('[share] picture capture failed, falling back to text', e);
      const ok = await shareText(message, `${name}'s walk`);
      if (ok) {
        Alert.alert('Sent as text', 'Pictures are not available on this device, so the stats went out as text instead.');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Share your progress" subtitle="As a picture, with your photo and stats">
      <ViewShot ref={shotRef} options={{ format: 'png' }}>
        <View style={styles.card}>
          <Text style={styles.kicker}>EcoTrek</Text>
          <Avatar name={name} uri={avatarUri} size={72} ring="rgba(255,255,255,0.25)" />
          <Text style={styles.headline}>{name} went outside</Text>
          <View style={styles.levelRow}>
            <Icon name="award" size={13} color={COLORS.primaryGlow} strokeWidth={2} />
            <Text style={styles.level}>{level}</Text>
          </View>
          <View style={styles.stats}>
            <Stat value={miles} unit={unit} label="Walked" />
            <Stat value={String(trees)} label={trees === 1 ? 'Tree' : 'Trees'} />
            <Stat value={String(streak)} label="Wk streak" />
            <Stat value={String(trails)} label="Trails" />
          </View>
          <View style={styles.footer}>
            <Icon name="tree" size={14} color={COLORS.primaryGlow} strokeWidth={1.8} />
            <Text style={styles.footerText}>Want to join me?</Text>
          </View>
        </View>
      </ViewShot>

      <Text style={styles.hint}>
        This is the picture you share — your photo, your stats. Or just show your phone.
      </Text>
      <Button
        label={sharing ? 'Making your picture…' : 'Share as picture'}
        icon={sharing ? undefined : 'share'}
        loading={sharing}
        size="lg"
        full
        onPress={shareAsPicture}
      />
    </Sheet>
  );
}

/* ── Web: prefer the native share sheet with the image, else download ────── */

async function shareOnWeb(uri: string, text: string, name: string) {
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
  if (!nav) throw new Error('no navigator');

  try {
    const blob = await (await fetch(uri)).blob();
    const file = new File([blob], 'ecotrek-card.png', { type: 'image/png' });

    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ title: `${name}'s EcoTrek card`, text, files: [file] });
      return;
    }

    // No file-sharing in this browser: save the picture and tell them to send it.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecotrek-card.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    Alert.alert('Picture saved', 'Your card was downloaded as a picture. Send it to your friend from the download.');
  } catch {
    // Last resort: the text version.
    await shareText(text, `${name}'s walk`);
  }
}

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  kicker: { ...TYPOGRAPHY.overline, color: COLORS.primaryGlow, letterSpacing: 2 },
  headline: { ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center', marginTop: SPACING.sm - 2 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  level: { ...TYPOGRAPHY.smallMed, color: COLORS.primaryGlow },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 21, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  statUnit: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  statLabel: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.6)', marginTop: 3, textTransform: 'uppercase' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
  },
  footerText: { ...TYPOGRAPHY.smallMed, color: '#fff' },
  hint: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
});
