import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon, { IconName } from '../components/Icon';
import { Button, Card } from '../components/ui';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useProfile } from '../context/ProfileContext';

type Step = 'welcome' | 'name' | 'body' | 'activity';

export default function SetupScreen({ onDone }: { onDone: () => void }) {
  const { setProfile } = useProfile();
  const [step, setStep] = useState<Step>('welcome');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weight, setWeight] = useState('');
  const [stepLength, setStepLength] = useState('');
  const [busy, setBusy] = useState(false);

  const handleComplete = async () => {
    setBusy(true);
    const totalInches = (parseInt(heightFt) || 0) * 12 + (parseInt(heightIn) || 0);
    // Default step length based on height if not provided
    const defaultStepLength = totalInches > 0 ? Math.round(totalInches * 0.413) : 28;

    await setProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age: parseInt(age) || 30,
      heightInches: totalInches || 67,
      weightPounds: parseInt(weight) || 155,
      stepLengthInches: parseInt(stepLength) || defaultStepLength,
    });
    setBusy(false);
    onDone();
  };

  const canProceedName = firstName.trim().length > 0;
  const canProceedBody = (parseInt(heightFt) || 0) > 0 && (parseInt(weight) || 0) > 0;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Progress indicator */}
            <View style={styles.progress}>
              <ProgressDot active={step === 'welcome'} done={step !== 'welcome'} />
              <ProgressLine />
              <ProgressDot active={step === 'name'} done={['body', 'activity'].includes(step)} />
              <ProgressLine />
              <ProgressDot active={step === 'body'} done={step === 'activity'} />
              <ProgressLine />
              <ProgressDot active={step === 'activity'} done={false} />
            </View>

            {step === 'welcome' ? (
              <View style={styles.stepContent}>
                <View style={styles.iconCircle}>
                  <Icon name="user" size={36} color={COLORS.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.title}>Let's set up your profile</Text>
                <Text style={styles.subtitle}>
                  This helps us calculate your calories burned, pace recommendations, and personalize your experience. It only takes a minute.
                </Text>

                <View style={styles.benefits}>
                  <BenefitRow icon="zap" text="Accurate calorie estimates" />
                  <BenefitRow icon="trending-up" text="Personalized pace tracking" />
                  <BenefitRow icon="activity" text="Better distance calculations" />
                  <BenefitRow icon="shield" text="Your data stays private on your device" />
                </View>

                <Button
                  label="Get started"
                  size="lg"
                  full
                  iconRight="arrow-right"
                  onPress={() => setStep('name')}
                />
              </View>
            ) : null}

            {step === 'name' ? (
              <View style={styles.stepContent}>
                <View style={styles.iconCircle}>
                  <Icon name="user" size={36} color={COLORS.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.title}>What's your name?</Text>
                <Text style={styles.subtitle}>We'll use this to personalize your experience.</Text>

                <View style={styles.form}>
                  <FormField
                    label="First name"
                    value={firstName}
                    onChange={setFirstName}
                    placeholder="Jane"
                    autoFocus
                  />
                  <FormField
                    label="Last name"
                    value={lastName}
                    onChange={setLastName}
                    placeholder="Doe"
                  />
                  <FormField
                    label="Age"
                    value={age}
                    onChange={setAge}
                    placeholder="25"
                    keyboard="number-pad"
                  />
                </View>

                <View style={styles.navRow}>
                  <Button label="Back" variant="ghost" onPress={() => setStep('welcome')} />
                  <Button
                    label="Continue"
                    iconRight="arrow-right"
                    disabled={!canProceedName}
                    onPress={() => setStep('body')}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : null}

            {step === 'body' ? (
              <View style={styles.stepContent}>
                <View style={styles.iconCircle}>
                  <Icon name="activity" size={36} color={COLORS.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.title}>Your body measurements</Text>
                <Text style={styles.subtitle}>
                  Used to calculate calories burned. You can update your weight anytime in settings.
                </Text>

                <View style={styles.form}>
                  <Text style={styles.fieldLabel}>Height</Text>
                  <View style={styles.heightRow}>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        value={heightFt}
                        onChangeText={setHeightFt}
                        placeholder="5"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="number-pad"
                        maxLength={1}
                        style={styles.input}
                      />
                      <Text style={styles.inputHint}>feet</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        value={heightIn}
                        onChangeText={setHeightIn}
                        placeholder="7"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="number-pad"
                        maxLength={2}
                        style={styles.input}
                      />
                      <Text style={styles.inputHint}>inches</Text>
                    </View>
                  </View>

                  <FormField
                    label="Weight (lbs)"
                    value={weight}
                    onChange={setWeight}
                    placeholder="155"
                    keyboard="number-pad"
                  />
                </View>

                <View style={styles.navRow}>
                  <Button label="Back" variant="ghost" onPress={() => setStep('name')} />
                  <Button
                    label="Continue"
                    iconRight="arrow-right"
                    disabled={!canProceedBody}
                    onPress={() => setStep('activity')}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : null}

            {step === 'activity' ? (
              <View style={styles.stepContent}>
                <View style={styles.iconCircle}>
                  <Icon name="boot" size={36} color={COLORS.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.title}>Step length (optional)</Text>
                <Text style={styles.subtitle}>
                  If you know your average step length, it improves distance accuracy. We'll estimate it from your height if you skip.
                </Text>

                <View style={styles.form}>
                  <FormField
                    label="Step length (inches)"
                    value={stepLength}
                    onChange={setStepLength}
                    placeholder={`~${Math.round(((parseInt(heightFt) || 5) * 12 + (parseInt(heightIn) || 7)) * 0.413)}`}
                    keyboard="number-pad"
                  />
                  <Text style={styles.fieldHint}>
                    Most people's step length is about 41% of their height.
                    {heightFt && heightIn
                      ? ` Based on your height, that's about ${Math.round(((parseInt(heightFt) || 5) * 12 + (parseInt(heightIn) || 7)) * 0.413)} inches.`
                      : ''}
                  </Text>
                </View>

                <View style={styles.navRow}>
                  <Button label="Back" variant="ghost" onPress={() => setStep('body')} />
                  <Button
                    label="Finish setup"
                    iconRight="check"
                    full
                    loading={busy}
                    onPress={handleComplete}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'number-pad';
  autoFocus?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        keyboardType={keyboard ?? 'default'}
        autoFocus={autoFocus}
        style={styles.input}
      />
    </View>
  );
}

function BenefitRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Icon name={icon} size={16} color={COLORS.primary} strokeWidth={2} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function ProgressDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <View
      style={[
        styles.progressDot,
        active && styles.progressDotActive,
        done && styles.progressDotDone,
      ]}
    >
      {done ? <Icon name="check" size={10} color="#fff" strokeWidth={3} /> : null}
    </View>
  );
}

function ProgressLine() {
  return <View style={styles.progressLine} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },

  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    gap: 0,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: COLORS.primary, width: 14, height: 14, borderRadius: 7 },
  progressDotDone: { backgroundColor: COLORS.primary },
  progressLine: { width: 30, height: 2, backgroundColor: COLORS.borderStrong },

  stepContent: { gap: SPACING.lg, alignItems: 'center' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...TYPOGRAPHY.h1, color: COLORS.text, textAlign: 'center' },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 340,
    marginTop: -SPACING.sm,
  },

  benefits: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flex: 1 },

  form: { width: '100%', gap: SPACING.md },
  fieldLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  fieldHint: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  inputHint: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  heightRow: { flexDirection: 'row', gap: SPACING.md },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, width: '100%' },
});
