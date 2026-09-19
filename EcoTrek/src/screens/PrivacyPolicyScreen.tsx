import React from 'react';
import { View } from 'react-native';
import Header from '../components/Header';
import PrivacyPolicyContent from '../components/PrivacyPolicyContent';
import { Screen, Card } from '../components/ui';
import { SPACING } from '../constants/theme';

/**
 * Read-only view of the privacy policy, reachable from Settings → About.
 * The consent (accept/reject) flow lives in PrivacyConsentScreen and runs
 * before the app; this screen just lets users re-read what they agreed to.
 */
export default function PrivacyPolicyScreen() {
  return (
    <Screen>
      <Header title="Privacy policy" subtitle="What EcoTrek collects, and why" back />
      <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl }}>
        <Card>
          <PrivacyPolicyContent />
        </Card>
      </View>
    </Screen>
  );
}
