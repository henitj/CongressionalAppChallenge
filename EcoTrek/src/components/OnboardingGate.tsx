import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from './Icon';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SetupScreen from '../screens/SetupScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PrivacyConsentScreen from '../screens/PrivacyConsentScreen';
import { keyFor } from '../services/storage';
import { PRIVACY_POLICY_VERSION } from '../constants/privacyPolicy';

/**
 * First-run order, per account:
 *
 *   sign in → privacy policy consent → one-time start tutorial → profile setup → app
 *
 * The privacy consent stores WHICH version of the policy was accepted, so a
 * material policy update (a new PRIVACY_POLICY_VERSION) re-asks every account
 * exactly once. Rejecting the policy keeps the user on the consent screen's
 * declined route, from which they can re-review or sign out — the app never
 * proceeds without an accepted policy on record.
 *
 * The tutorial is deliberately persisted separately from the profile. That
 * makes Skip/Done idempotent, and means signing out and back in as the same
 * account never makes the intro play again. Existing accounts see it once on
 * their first launch after this update, then follow the same persisted path.
 */
const INTRO_KEY = 'start_tutorial_complete';
const CONSENT_KEY = 'privacy_policy_accepted_version';

type IntroState = 'loading' | 'needed' | 'complete';
type ConsentState = 'loading' | 'needed' | 'accepted';

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { hasProfile, loading: profileLoading } = useProfile();
  const { colors } = useTheme();
  const [introState, setIntroState] = useState<IntroState>('loading');
  const [consentState, setConsentState] = useState<ConsentState>('loading');

  useEffect(() => {
    let alive = true;
    setIntroState('loading');
    setConsentState('loading');

    (async () => {
      if (!user?.id) {
        if (alive) {
          setIntroState('complete');
          setConsentState('accepted');
        }
        return;
      }

      try {
        const consented = await AsyncStorage.getItem(keyFor(user.id, CONSENT_KEY));
        if (alive) {
          setConsentState(consented === PRIVACY_POLICY_VERSION ? 'accepted' : 'needed');
        }
      } catch {
        // A storage outage must not trap someone on a blank launch screen.
        // Ask for consent this render; Accept will try to persist again.
        if (alive) setConsentState('needed');
      }

      try {
        const stored = await AsyncStorage.getItem(keyFor(user.id, INTRO_KEY));
        if (stored === 'true') {
          if (alive) setIntroState('complete');
        } else if (alive) {
          setIntroState('needed');
        }
      } catch {
        // Same idea: show the tutorial once for this render; Done/Skip will
        // try again.
        if (alive) setIntroState(hasProfile ? 'complete' : 'needed');
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.id, hasProfile]);

  const acceptPolicy = async () => {
    if (user?.id) {
      try {
        await AsyncStorage.setItem(keyFor(user.id, CONSENT_KEY), PRIVACY_POLICY_VERSION);
      } catch {
        // Still advance for this session. If the device cannot persist
        // anything, a later launch will simply ask again — safer than a
        // dead end.
      }
    }
    setConsentState('accepted');
  };

  const completeIntro = async () => {
    if (user?.id) {
      try {
        await AsyncStorage.setItem(keyFor(user.id, INTRO_KEY), 'true');
      } catch {
        // The gate still advances. A later launch can show the intro again if
        // the device cannot persist anything, which is safer than a dead end.
      }
    }
    setIntroState('complete');
  };

  if (profileLoading || introState === 'loading' || consentState === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: 20,
            backgroundColor: colors.primarySurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="tree" size={30} color={colors.primary} strokeWidth={1.9} />
        </View>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (consentState === 'needed') return <PrivacyConsentScreen onAccept={acceptPolicy} />;
  if (introState === 'needed') return <OnboardingScreen onDone={completeIntro} />;
  if (!hasProfile) return <SetupScreen onDone={() => {}} />;

  return <>{children}</>;
}
