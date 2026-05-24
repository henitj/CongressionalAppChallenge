import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Pressable } from 'react-native';
import Header from '../components/Header';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

const RESOURCES = [
  { label: 'Emergency · 911', url: 'tel:911' },
  { label: 'Austin Park Rangers', url: 'tel:5129747275' },
  { label: 'Poison Control', url: 'tel:18002221222' },
  { label: 'Trail conditions (austintexas.gov)', url: 'https://austintexas.gov/department/parks-and-recreation' },
];

const TIPS = [
  {
    title: 'Heat & hydration',
    body: 'Austin summers regularly exceed 100°F. Drink water before, during and after. Avoid 11am–5pm hikes in July/August.',
  },
  {
    title: 'Share your route',
    body: 'Send your planned trail and ETA to a friend. Cell service can be spotty in Barton Creek and Walnut Creek.',
  },
  {
    title: 'Wildlife awareness',
    body: 'Watch for snakes (copperheads, rattlesnakes), scorpions, and feral hogs in greenbelt areas. Give wildlife space.',
  },
  {
    title: 'Weather alerts',
    body: 'Flash flooding can occur in low-water crossings. If water is rising, turn around — don\'t drown.',
  },
  {
    title: 'Bike etiquette',
    body: 'Wear a helmet, use lights at dusk, call out when passing, and yield to pedestrians on shared trails.',
  },
];

export default function SafetyScreen() {
  return (
    <View style={styles.container}>
      <Header title="Safety" subtitle="Green spaces · public health" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>🛡️ EcoTrek safety promise</Text>
          <Text style={styles.alertText}>
            Healthy green spaces start with safe people in them. We share
            location-aware guidance and resources so every Austin trail stays
            welcoming for the whole community.
          </Text>
        </View>

        <Text style={styles.section}>Emergency resources</Text>
        {RESOURCES.map((r) => (
          <Pressable
            key={r.label}
            style={styles.resource}
            onPress={() => Linking.openURL(r.url)}
          >
            <Text style={styles.resourceText}>{r.label}</Text>
            <Text style={styles.resourceArrow}>→</Text>
          </Pressable>
        ))}

        <Text style={styles.section}>Trail tips</Text>
        {TIPS.map((t) => (
          <View key={t.title} style={styles.tip}>
            <Text style={styles.tipTitle}>{t.title}</Text>
            <Text style={styles.tipBody}>{t.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            EcoTrek partners with Veritree to plant native species in Austin.
            Healthier canopies = cooler trails = safer hikers and bikers.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  alert: {
    backgroundColor: '#FFF4E0',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    marginBottom: SPACING.md,
  },
  alertTitle: { ...TYPOGRAPHY.h3, color: COLORS.bark },
  alertText: { ...TYPOGRAPHY.body, color: COLORS.text, marginTop: SPACING.xs, lineHeight: 22 },
  section: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  resource: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  resourceText: { ...TYPOGRAPHY.body, color: COLORS.text, fontWeight: '600' },
  resourceArrow: { color: COLORS.primary, fontWeight: '900' },
  tip: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  tipTitle: { ...TYPOGRAPHY.h3, color: COLORS.primaryDark },
  tipBody: { ...TYPOGRAPHY.body, color: COLORS.text, marginTop: 4, lineHeight: 22 },
  footer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#EAF6EE',
  },
  footerText: { ...TYPOGRAPHY.small, color: COLORS.primaryDark, textAlign: 'center' },
});
