import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon, { IconName } from './Icon';
import { useResponsive } from '../hooks/useResponsive';
import { AVATAR_COLORS, COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../constants/theme';

/* ════════════════════════════════════════════════════════════════════════
   Screen — consistent page shell
   ════════════════════════════════════════════════════════════════════════ */

export function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
  refreshControl,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<any>;
}) {
  const { contentWidth, isTablet } = useResponsive();

  // On a tablet the page content is capped and centred. Without this, cards
  // stretch to 1000px and the layout falls apart.
  const column: ViewStyle = isTablet
    ? { width: contentWidth, alignSelf: 'center' }
    : { width: '100%' };

  if (!scroll) {
    return (
      <View style={[ui.screen, style]}>
        <View style={[{ flex: 1 }, column]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[ui.screen, style]}>
      <ScrollView
        contentContainerStyle={[ui.scrollContent, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={column}>{children}</View>
      </ScrollView>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Card
   ════════════════════════════════════════════════════════════════════════ */

export function Card({
  children,
  style,
  padded = true,
  onPress,
  tone = 'default',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'sunken' | 'dark' | 'accent';
}) {
  const toneStyle =
    tone === 'sunken'
      ? ui.cardSunken
      : tone === 'dark'
      ? ui.cardDark
      : tone === 'accent'
      ? ui.cardAccent
      : null;

  const content = (
    <View style={[ui.card, toneStyle, padded && ui.cardPad, style]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && ui.pressed}>
      {content}
    </Pressable>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Section header
   ════════════════════════════════════════════════════════════════════════ */

export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[ui.sectionHeader, style]}>
      <Text style={ui.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={ui.sectionAction}>
          <Text style={ui.sectionActionText}>{action}</Text>
          <Icon name="chevron-right" size={14} color={COLORS.primary} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Button
   ════════════════════════════════════════════════════════════════════════ */

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  loading,
  full,
  style,
  tone,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: string;
}) {
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary'
      ? tone ?? COLORS.primary
      : variant === 'dark'
      ? COLORS.primaryDark
      : variant === 'danger'
      ? COLORS.danger
      : variant === 'secondary'
      ? COLORS.surface
      : 'transparent';

  const fg =
    variant === 'secondary'
      ? COLORS.text
      : variant === 'ghost'
      ? tone ?? COLORS.primary
      : '#fff';

  const pad =
    size === 'sm'
      ? { paddingVertical: 12, paddingHorizontal: 16, minHeight: 44 }
      : size === 'lg'
      ? { paddingVertical: 18, paddingHorizontal: 24, minHeight: 58 }
      : { paddingVertical: 15, paddingHorizontal: 20, minHeight: 52 };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        ui.btn,
        pad,
        { backgroundColor: bg },
        variant === 'secondary' && ui.btnBordered,
        variant !== 'ghost' && variant !== 'secondary' && SHADOWS.sm,
        full && { alignSelf: 'stretch' },
        isDisabled && ui.btnDisabled,
        pressed && ui.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} strokeWidth={2} /> : null}
          <Text
            style={[
              ui.btnLabel,
              { color: fg },
              size === 'sm' && { fontSize: 15 },
              size === 'lg' && { fontSize: 18 },
            ]}
          >
            {label}
          </Text>
          {iconRight ? (
            <Icon name={iconRight} size={size === 'sm' ? 15 : 17} color={fg} strokeWidth={2} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Pill / tag
   ════════════════════════════════════════════════════════════════════════ */

export function Pill({
  label,
  icon,
  tone = 'neutral',
  size = 'md',
  style,
}: {
  label: string;
  icon?: IconName;
  tone?: 'neutral' | 'primary' | 'accent' | 'danger' | 'warning' | 'info' | 'success' | 'dark';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: COLORS.surfaceSunken, fg: COLORS.textSecondary },
    primary: { bg: COLORS.primarySurface, fg: COLORS.primary },
    accent: { bg: COLORS.accentLight, fg: COLORS.accentDark },
    danger: { bg: COLORS.dangerLight, fg: COLORS.danger },
    warning: { bg: COLORS.warningLight, fg: COLORS.warning },
    info: { bg: COLORS.infoLight, fg: COLORS.info },
    success: { bg: COLORS.successLight, fg: COLORS.success },
    dark: { bg: 'rgba(255,255,255,0.14)', fg: '#fff' },
  };
  const c = map[tone];
  return (
    <View
      style={[
        ui.pill,
        { backgroundColor: c.bg },
        size === 'sm' && { paddingVertical: 3, paddingHorizontal: 8 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 11 : 13} color={c.fg} strokeWidth={2.2} /> : null}
      <Text style={[ui.pillText, { color: c.fg }, size === 'sm' && { fontSize: 10.5 }]}>
        {label}
      </Text>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Progress bar
   ════════════════════════════════════════════════════════════════════════ */

export function ProgressBar({
  percent,
  color = COLORS.primary,
  track = COLORS.surfaceSunken,
  height = 7,
  style,
}: {
  percent: number;
  color?: string;
  track?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <View style={[{ height, backgroundColor: track, borderRadius: height / 2, overflow: 'hidden' }, style]}>
      <View style={{ width: `${p}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Segmented control
   ════════════════════════════════════════════════════════════════════════ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[ui.segmented, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[ui.segment, active && ui.segmentActive]}
          >
            {o.icon ? (
              <Icon
                name={o.icon}
                size={14}
                color={active ? COLORS.primary : COLORS.textMuted}
                strokeWidth={2}
              />
            ) : null}
            <Text style={[ui.segmentText, active && ui.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Empty state
   ════════════════════════════════════════════════════════════════════════ */

export function EmptyState({
  icon = 'info',
  title,
  message,
  action,
  onAction,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={ui.empty}>
      <View style={ui.emptyIcon}>
        <Icon name={icon} size={24} color={COLORS.textLight} strokeWidth={1.7} />
      </View>
      <Text style={ui.emptyTitle}>{title}</Text>
      {message ? <Text style={ui.emptyMessage}>{message}</Text> : null}
      {action ? (
        <Button label={action} onPress={onAction} variant="secondary" size="sm" style={{ marginTop: SPACING.md }} />
      ) : null}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Avatar
   ════════════════════════════════════════════════════════════════════════ */

/**
 * Deterministic avatar colours. The same name always gets the same shade, so
 * a club roster reads as a set of distinct people rather than a wall of
 * identical circles.
 */
function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({
  name,
  uri,
  size = 40,
  ring,
  style,
}: {
  name?: string | null;
  uri?: string | null;
  size?: number;
  ring?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const label = (name ?? '').trim();
  const initials =
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorForName(label || 'trekker'),
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        ring ? { borderWidth: 2, borderColor: ring } : null,
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Text
          style={{
            color: '#fff',
            fontWeight: '600',
            // Scaled to the circle, and never so tight that the second
            // initial gets clipped.
            fontSize: Math.round(size * 0.38),
            letterSpacing: 0.3,
            includeFontPadding: false,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Bottom sheet modal
   ════════════════════════════════════════════════════════════════════════ */

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Sheets contain text inputs (club codes, names), so they have to lift
          clear of the keyboard rather than sitting behind it. */}
      <KeyboardAvoidingView
        style={ui.sheetBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={ui.sheet}>
          <View style={ui.sheetGrabber} />
          <View style={ui.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={ui.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={ui.sheetSubtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={ui.sheetClose}>
              <Icon name="x" size={18} color={COLORS.textSecondary} strokeWidth={2.1} />
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: 520 }}
            contentContainerStyle={{ paddingBottom: SPACING.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Banner (used for weather warnings, notices)
   ════════════════════════════════════════════════════════════════════════ */

export function Banner({
  tone = 'info',
  icon,
  title,
  message,
  onPress,
  right,
  style,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'neutral';
  icon?: IconName;
  title: string;
  message?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const map = {
    info: { bg: COLORS.infoLight, fg: COLORS.info, border: COLORS.infoBorder },
    warning: { bg: COLORS.warningLight, fg: COLORS.warning, border: COLORS.warningBorder },
    danger: { bg: COLORS.dangerLight, fg: COLORS.danger, border: COLORS.dangerBorder },
    success: { bg: COLORS.successLight, fg: COLORS.success, border: COLORS.successBorder },
    neutral: { bg: COLORS.surfaceSunken, fg: COLORS.textSecondary, border: COLORS.border },
  }[tone];

  const inner = (
    <View style={[ui.banner, { backgroundColor: map.bg, borderColor: map.border }, style]}>
      {icon ? (
        <View style={{ paddingTop: 1 }}>
          <Icon name={icon} size={18} color={map.fg} strokeWidth={2} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[ui.bannerTitle, { color: map.fg }]}>{title}</Text>
        {message ? <Text style={ui.bannerMessage}>{message}</Text> : null}
      </View>
      {right}
      {onPress ? <Icon name="chevron-right" size={16} color={map.fg} /> : null}
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && ui.pressed}>
      {inner}
    </Pressable>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Divider
   ════════════════════════════════════════════════════════════════════════ */

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[ui.divider, style]} />;
}

/* ════════════════════════════════════════════════════════════════════════
   Metric — big number with label
   ════════════════════════════════════════════════════════════════════════ */

export function Metric({
  value,
  unit,
  label,
  color = COLORS.text,
  align = 'flex-start',
  size = 'md',
}: {
  value: string | number;
  unit?: string;
  label?: string;
  color?: string;
  align?: 'flex-start' | 'center';
  size?: 'md' | 'lg';
}) {
  return (
    <View style={{ alignItems: align }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={[size === 'lg' ? TYPOGRAPHY.metricLg : TYPOGRAPHY.metric, { color }]}>
          {value}
        </Text>
        {unit ? <Text style={[TYPOGRAPHY.h4, { color, opacity: 0.55 }]}>{unit}</Text> : null}
      </View>
      {label ? (
        <Text style={[TYPOGRAPHY.overline, { color: COLORS.textMuted, marginTop: 2 }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 110 },

  pressed: { opacity: 0.72 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardPad: { padding: SPACING.md },
  cardSunken: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.borderLight, shadowOpacity: 0 },
  cardDark: { backgroundColor: COLORS.primaryDark, borderColor: 'rgba(255,255,255,0.08)' },
  cardAccent: { backgroundColor: COLORS.accentLight, borderColor: COLORS.warningBorder, shadowOpacity: 0 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm + 2,
  },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { ...TYPOGRAPHY.smallMed, color: COLORS.primary },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: RADIUS.md,
  },
  btnBordered: { borderWidth: 1, borderColor: COLORS.borderStrong },
  btnDisabled: { opacity: 0.45 },
  btnLabel: { fontSize: 16, fontWeight: '700', letterSpacing: -0.1 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4.5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.1 },


  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.md,
    padding: 3.5,
    gap: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8.5,
    borderRadius: RADIUS.sm + 1,
  },
  segmentActive: { backgroundColor: COLORS.surface, ...SHADOWS.sm },
  segmentText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  segmentTextActive: { color: COLORS.text },


  empty: { alignItems: 'center', paddingVertical: SPACING.xl, paddingHorizontal: SPACING.lg },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md - 4,
  },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textSecondary, textAlign: 'center' },
  emptyMessage: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },

  sheetBackdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.md + 4,
    paddingTop: SPACING.sm,
    maxHeight: '90%',
  },
  sheetGrabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.md },
  sheetTitle: { ...TYPOGRAPHY.h2, color: COLORS.text },
  sheetSubtitle: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  sheetClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm + 2,
    padding: SPACING.md - 3,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  bannerTitle: { ...TYPOGRAPHY.h4 },
  bannerMessage: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: 2 },

  divider: { height: 1, backgroundColor: COLORS.borderLight },
});

export { ui as uiStyles };
