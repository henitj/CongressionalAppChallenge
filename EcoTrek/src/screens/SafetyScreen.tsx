import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Pressable,
} from 'react-native';
import Header from '../components/Header';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

const EMERGENCY = [
  { label: 'Emergency Services', sub: '911', url: 'tel:911', icon: '🚨', color: COLORS.danger },
  { label: 'Austin Park Rangers', sub: '(512) 974-7275', url: 'tel:5129747275', icon: '🌲', color: COLORS.primary },
  { label: 'Poison Control Center', sub: '1-800-222-1222', url: 'tel:18002221222', icon: '☠️', color: COLORS.warning },
  { label: 'Trail Conditions', sub: 'austintexas.gov', url: 'https://austintexas.gov/department/parks-and-recreation', icon: '🗺️', color: COLORS.sky },
];

const TIPS = [
  {
    icon: '🌡️',
    title: 'Heat & hydration',
    body: 'Austin summers regularly exceed 100°F. Drink 16–24 oz of water per hour. Avoid trails between 11am–5pm in July and August. Wear light, breathable clothing and apply sunscreen.',
    severity: 'high' as const,
  },
  {
    icon: '📍',
    title: 'Share your route',
    body: 'Send your planned trail and expected return time to a trusted contact before you go. Cell service can be spotty in Barton Creek Greenbelt and Walnut Creek.',
    severity: 'medium' as const,
  },
  {
    icon: '🐍',
    title: 'Wildlife awareness',
    body: 'Watch for copperheads and western diamondback rattlesnakes near rocky outcrops. Scorpions hide under logs and rocks. Feral hogs are active at dawn and dusk — give them space.',
    severity: 'high' as const,
  },
  {
    icon: '🌊',
    title: 'Flash flood safety',
    body: 'Central Texas is in Flash Flood Alley. Water levels at creek crossings can rise in minutes. Turn Around, Don\'t Drown — never cross moving water above ankle depth.',
    severity: 'high' as const,
  },
  {
    icon: '🚴',
    title: 'Bike trail etiquette',
    body: 'Always wear a helmet. Use front and rear lights at dusk. Call out "on your left" when passing. Yield to pedestrians on shared paths and keep speeds reasonable.',
    severity: 'low' as const,
  },
  {
    icon: '🎒',
    title: 'Trail essentials',
    body: 'Carry at minimum: water (32+ oz), snacks, sunscreen, a charged phone, a basic first aid kit, and a fully charged battery pack. Download offline maps before remote hikes.',
    severity: 'medium' as const,
  },
];

const SEVERITY_COLORS = {
  high: COLORS.danger,
  medium: COLORS.warning,
  low: COLORS.primary,
};

const SEVERITY_BG = {
  high: COLORS.dangerLight,
  medium: COLORS.warningLight,
  low: COLORS.primarySurface,
};

export default function SafetyScreen() {
  const [expandedTip, setExpandedTip] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <Header title="Safety" subtitle="Stay safe · Trail ready" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Promise card */}
        <View style={styles.promiseCard}>
          <View style={styles.promiseBg} />
          <Text style={styles.promiseIcon}>🛡️</Text>
          <Text style={styles.promiseTitle}>EcoTrek Safety Promise</Text>
          <Text style={styles.promiseBody}>
            Every trail deserves safe explorers. We share real, local safety
            guidance and emergency resources so Austin's green spaces stay
            welcoming for everyone — families, students, and solo adventurers.
          </Text>
        </View>

        {/* Emergency contacts */}
        <Text style={styles.sectionTitle}>Emergency contacts</Text>
        <View style={styles.emergencyGrid}>
          {EMERGENCY.map((r) => (
            <Pressable
              key={r.label}
              style={({ pressed }) => [
                styles.emergencyCard,
                { borderTopColor: r.color },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => Linking.openURL(r.url)}
            >
              <Text style={styles.emergencyIcon}>{r.icon}</Text>
              <Text style={styles.emergencyLabel}>{r.label}</Text>
              <Text style={[styles.emergencySub, { color: r.color }]}>
                {r.sub}
              </Text>
              <Text style={[styles.emergencyTap, { color: r.color }]}>
                Tap to call →
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Trail tips */}
        <Text style={styles.sectionTitle}>Trail safety guide</Text>
        {TIPS.map((t) => (
          <Pressable
            key={t.title}
            style={[
              styles.tipCard,
              expandedTip === t.title && {
                borderLeftColor: SEVERITY_COLORS[t.severity],
              },
            ]}
            onPress={() =>
              setExpandedTip(expandedTip === t.title ? null : t.title)
            }
          >
            <View style={styles.tipHeader}>
              <View
                style={[
                  styles.tipIconWrap,
                  { backgroundColor: SEVERITY_BG[t.severity] },
                ]}
              >
                <Text style={styles.tipIcon}>{t.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{t.title}</Text>
                <View
                  style={[
                    styles.severityPill,
                    { backgroundColor: SEVERITY_BG[t.severity] },
                  ]}
                >
                  <Text
                    style={[
                      styles.severityText,
                      { color: SEVERITY_COLORS[t.severity] },
                    ]}
                  >
                    {t.severity.toUpperCase()} PRIORITY
                  </Text>
                </View>
              </View>
              <Text style={styles.tipChevron}>
                {expandedTip === t.title ? '▲' : '▼'}
              </Text>
            </View>
            {expandedTip === t.title && (
              <Text style={styles.tipBody}>{t.body}</Text>
            )}
          </Pressable>
        ))}

        {/* Preparedness checklist */}
        <Text style={styles.sectionTitle}>Before you go checklist</Text>
        <View style={styles.checklistCard}>
          {[
            { item: 'Water (32+ oz per hour)', icon: '💧' },
            { item: 'Sunscreen SPF 30+', icon: '☀️' },
            { item: 'Charged phone + backup battery', icon: '🔋' },
            { item: 'Snacks / energy food', icon: '🍌' },
            { item: 'First aid kit', icon: '🩹' },
            { item: 'Trail map downloaded offline', icon: '🗺️' },
            { item: 'Shared route with contact', icon: '📱' },
            { item: 'Weather check done', icon: '⛅' },
          ].map((c) => (
            <ChecklistItem key={c.item} icon={c.icon} text={c.item} />
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footerCard}>
          <Text style={styles.footerIcon}>🌳</Text>
          <Text style={styles.footerText}>
            Healthier urban canopies mean cooler trails, cleaner air, and safer
            conditions for every Austin trekker. Your EcoPoints fund the trees
            that protect us all.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ChecklistItem({ icon, text }: { icon: string; text: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <Pressable
      style={styles.checklistRow}
      onPress={() => setChecked((c) => !c)}
    >
      <View
        style={[
          styles.checkbox,
          checked && {
            backgroundColor: COLORS.primary,
            borderColor: COLORS.primary,
          },
        ]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.checkIcon}>{icon}</Text>
      <Text
        style={[
          styles.checkText,
          checked && {
            textDecorationLine: 'line-through',
            color: COLORS.textMuted,
          },
        ]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxxl },

  // Promise card
  promiseCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  promiseBg: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  promiseIcon: { fontSize: 48, marginBottom: SPACING.sm },
  promiseTitle: {
    ...TYPOGRAPHY.h2,
    color: '#fff',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  promiseBody: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 23,
  },

  // Section title
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // Emergency grid
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  emergencyCard: {
    width: '47.5%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderTopWidth: 3,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emergencyIcon: { fontSize: 28, marginBottom: SPACING.xs },
  emergencyLabel: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: 2 },
  emergencySub: { ...TYPOGRAPHY.smallMed, marginBottom: 4 },
  emergencyTap: { ...TYPOGRAPHY.micro, fontWeight: '700', letterSpacing: 0.3 },

  // Tips
  tipCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.border,
    ...SHADOWS.sm,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tipIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipIcon: { fontSize: 22 },
  tipTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: 4 },
  severityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  severityText: { ...TYPOGRAPHY.micro, letterSpacing: 0.5 },
  tipChevron: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  tipBody: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginTop: SPACING.md,
    lineHeight: 23,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  // Checklist
  checklistCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '900' },
  checkIcon: { fontSize: 18 },
  checkText: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flex: 1 },

  // Footer
  footerCard: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
  },
  footerIcon: { fontSize: 40, marginBottom: SPACING.sm },
  footerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primaryDark,
    textAlign: 'center',
    lineHeight: 23,
  },
});