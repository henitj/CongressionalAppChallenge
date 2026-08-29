import React from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import ConditionsCard from '../components/ConditionsCard';
import { Screen, Card, SectionHeader, Divider, Banner, Button } from '../components/ui';
import { ColorPalette, RADIUS, SPACING } from '../constants/theme';
import { useWeather } from '../context/WeatherContext';
import { Typography, useTheme } from '../context/ThemeContext';

type Guide = {
  icon: IconName;
  title: string;
  points: string[];
};

const GUIDES: Guide[] = [
  {
    icon: 'thermometer',
    title: 'Heat',
    points: [
      'Central Texas heat is the most common reason people get hurt on these trails.',
      'Above a 100°F heat index, move your trek to before 9 AM or after 7 PM.',
      'Carry one litre of water per hour, and drink before you feel thirsty.',
      'Cramping, headache or goosebumps in the heat mean stop, get shade, and cool down.',
    ],
  },
  {
    icon: 'water',
    title: 'Water and flooding',
    points: [
      'Barton, Bull and Shoal creeks rise in minutes during a storm, even one upstream.',
      'Never walk or ride through moving water. Six inches will take your feet out.',
      'If a low-water crossing is covered, turn around. It is not worth it.',
      'Check the conditions report above before heading into any creek canyon.',
    ],
  },
  {
    icon: 'cloud-lightning',
    title: 'Storms',
    points: [
      'Lightning, not rain, is the danger. If you can hear thunder, you are in range.',
      'Get off ridgelines and away from lone tall trees.',
      'Wait 30 minutes after the last thunder before continuing.',
    ],
  },
  {
    icon: 'navigation',
    title: 'Before you leave',
    points: [
      'Tell someone your route and when you expect to be back.',
      'Screenshot the trail map — cell service drops in the greenbelt canyons.',
      'Start with a full battery. GPS tracking uses a lot of it.',
      'Know where your nearest trailhead exit is.',
    ],
  },
  {
    icon: 'eye',
    title: 'Wildlife and plants',
    points: [
      'Poison ivy grows right up to the trail edge — leaves of three, leave it be.',
      'Snakes sun on rocks and trails in warm months. Watch where you place hands and feet.',
      'Give any animal a wide berth. Do not feed anything.',
      'Coyotes are common at dawn and dusk and want nothing to do with you.',
    ],
  },
  {
    icon: 'users',
    title: 'Sharing the trail',
    points: [
      'Bikes yield to walkers, everyone yields to horses.',
      'Call out before you pass. A bell works better than a shout.',
      'Uphill traffic has right of way.',
      'Pack out everything you bring in.',
    ],
  },
];

const EMERGENCY = [
  { label: 'Emergency', value: '911', tel: '911' },
  { label: 'Austin Police non-emergency', value: '(512) 974-5000', tel: '5129745000' },
  { label: 'Texas Poison Center', value: '(800) 222-1222', tel: '8002221222' },
  { label: 'Austin Parks and Recreation', value: '(512) 974-6700', tel: '5129746700' },
];

export default function SafetyScreen() {
  const navigation = useNavigation<any>();
  const { report } = useWeather();
  const { colors, typography } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <Screen>
      <Header title="Safety" subtitle="Know before you go" back />

      <View style={styles.body}>
        <ConditionsCard />

        {report && report.level === 'danger' ? (
          <Banner
            tone="danger"
            icon="alert-triangle"
            title="Right now, staying in is the better call"
            message="Whatever you had planned, it will still be there tomorrow. Sit this one out."
            onPress={() => navigation.navigate('Conditions')}
          />
        ) : null}

        {/* Emergency */}
        <View>
          <SectionHeader title="Emergency numbers" />
          <Card padded={false}>
            {EMERGENCY.map((e, i) => (
              <View key={e.tel}>
                {i > 0 ? <Divider style={{ marginLeft: 58 }} /> : null}
                <Pressable
                  onPress={() => Linking.openURL(`tel:${e.tel}`)}
                  style={({ pressed }) => [styles.callRow, pressed && { opacity: 0.7 }]}
                >
                  <View style={[styles.callIcon, i === 0 && { backgroundColor: colors.dangerLight }]}>
                    <Icon
                      name={i === 0 ? 'alert-circle' : 'info'}
                      size={16}
                      color={i === 0 ? colors.danger : colors.textMuted}
                      strokeWidth={1.9}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.callLabel}>{e.label}</Text>
                    <Text style={styles.callValue}>{e.value}</Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.textLight} />
                </Pressable>
              </View>
            ))}
          </Card>
        </View>

        {/* Guides */}
        <View>
          <SectionHeader title="Trail safety" />
          <View style={{ gap: SPACING.sm }}>
            {GUIDES.map((g) => (
              <Card key={g.title}>
                <View style={styles.guideHead}>
                  <View style={styles.guideIcon}>
                    <Icon name={g.icon} size={18} color={colors.primary} strokeWidth={1.9} />
                  </View>
                  <Text style={styles.guideTitle}>{g.title}</Text>
                </View>
                {g.points.map((p, i) => (
                  <View key={i} style={styles.pointRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.pointText}>{p}</Text>
                  </View>
                ))}
              </Card>
            ))}
          </View>
        </View>

        <Button
          label="View full conditions report"
          variant="secondary"
          icon="cloud"
          full
          onPress={() => navigation.navigate('Conditions')}
        />
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: SPACING.md + 2 },

    callRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4, padding: SPACING.md - 3, minHeight: 56 },
    callIcon: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.sm,
      backgroundColor: c.surfaceSunken,
      alignItems: 'center',
      justifyContent: 'center',
    },
    callLabel: { ...t.bodyMed, color: c.text },
    callValue: { ...t.small, color: c.textMuted, marginTop: 1 },

    guideHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2, marginBottom: SPACING.sm + 2 },
    guideIcon: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.sm + 2,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    guideTitle: { ...t.h3, color: c.text },
    pointRow: { flexDirection: 'row', gap: SPACING.sm + 2, marginBottom: 7, alignItems: 'flex-start' },
    bullet: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.textLight,
      marginTop: 8,
    },
    pointText: { ...t.small, color: c.textSecondary, flex: 1 },
  });
}
