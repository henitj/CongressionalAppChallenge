import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon, { IconName } from '../components/Icon';
import { Button } from '../components/ui';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';

type Step = 'welcome' | 'name' | 'body' | 'activity';

export default function SetupScreen({ onDone }: { onDone: () => void }) {
  const { setProfile } = useProfile();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weight, setWeight] = useState('');
  const [stepLength, setStepLength] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleComplete = async () => {
    setBusy(true);
    const totalInches = (parseInt(heightFt, 10) || 0) * 12 + (parseInt(heightIn, 10) || 0);
    const defaultStepLength = totalInches > 0 ? Math.round(totalInches * 0.413) : 28;
    const first = firstName.trim();
    const last = lastName.trim();

    await setProfile({
      firstName: first,
      lastName: last,
      age: parseInt(age, 10) || 30,
      heightInches: totalInches || 67,
      weightPounds: parseInt(weight, 10) || 155,
      stepLengthInches: parseInt(stepLength, 10) || defaultStepLength,
    });

    const full = `${first} ${last}`.trim();
    if (full) await updateUser({ name: full });

    setBusy(false);
    onDone();
  };

  const skipSetup = async () => {
    const first = firstName.trim() || (user?.name ?? '').trim().split(/\s+/)[0] || 'Friend';
    const totalInches = (parseInt(heightFt, 10) || 0) * 12 + (parseInt(heightIn, 10) || 0);
    await setProfile({
      firstName: first,
      lastName: lastName.trim(),
      age: parseInt(age, 10) || 0,
      heightInches: totalInches,
      weightPounds: parseInt(weight, 10) || 0,
      stepLengthInches: parseInt(stepLength, 10) || 0,
    });
    onDone();
  };

  const canProceedName = firstName.trim().length > 0;
  const canProceedBody = (parseInt(heightFt, 10) || 0) > 0 && (parseInt(weight, 10) || 0) > 0;

  const estimatedStep = Math.round(((parseInt(heightFt, 10) || 5) * 12 + (parseInt(heightIn, 10) || 7)) * 0.413);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.topBar}>
            <View style={styles.progress}>
              <ProgressDot active={step === 'welcome'} done={step !== 'welcome'} />
              <ProgressLine />
              <ProgressDot active={step === 'name'} done={['body', 'activity'].includes(step)} />
              <ProgressLine />
              <ProgressDot active={step === 'body'} done={step === 'activity'} />
              <ProgressLine />
              <ProgressDot active={step === 'activity'} done={false} />
            </View>
            <Button label="Skip" variant="ghost" onPress={skipSetup} />
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            {step === 'welcome' ? (
              <View style={styles.stepContent}>
                <View style={styles.iconCircle}>
                  <Icon name="user" size={36} color={COLORS.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.title}>A few things about you</Text>
                <Text style={styles.subtitle}>
                  This helps us estimate calories and show your name on the home screen. It takes about a minute.
                </Text>

                <View style={styles.benefits}>
                  <BenefitRow icon="zap" text="Better calorie estimates" />
                  <BenefitRow icon="trending-up" text="A pace that fits you" />
                  <BenefitRow icon="shield" text="Your answers stay on this phone" />
                </View>
              </View>
            ) : null}

            {step === 'name' ? (
              <View style={styles.stepContent}>
                <View style={styles.iconCircle}>
                  <Icon name="user" size={36} color={COLORS.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.title}>What should we call you?</Text>
                <Text style={styles.subtitle}>We use your first name on the home screen.</Text>

                <View style={styles.form}>
                  <FormField
                    label="First name"
                    value={firstName}
                    onChange={setFirstName}
                    placeholder="Jane"
                    autoFocus
                    onFocus={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                  />
                  <FormField
                    label="Last name"
                    value={lastName}
                    onChange={setLastName}
                    placeholder="Doe"
                    onFocus={() => scrollRef.current?.scrollTo({ y: 80, animated: true })}
                  />
                  <FormField
                    label="Age"
                    value={age}
                    onChange={setAge}
                    placeholder="65"
                    keyboard="number-pad"
                    onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
                  />
                </View>
              </View>
            ) : null}

            {step === 'body' ? (
              <View style={styles.stepContent}>
                <View style={styles.iconCircle}>
                  <Icon name="activity" size={36} color={COLORS.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.title}>Height and weight</Text>
                <Text style={styles.subtitle}>
                  Used only to estimate calories. You can change your weight later.
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
                        accessibilityLabel="Height in feet"
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
                        accessibilityLabel="Height in inches"
                      />
                      <Text style={styles.inputHint}>inches</Text>
                    </View>
                  </View>

                  <FormField
                    label="Weight (pounds)"
                    value={weight}
                    onChange={setWeight}
                    placeholder="155"
                    keyboard="number-pad"
                    onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
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
                  Skip this if you are not sure. We will estimate it from your height.
                </Text>

                <View style={styles.form}>
                  <FormField
                    label="Step length (inches)"
                    value={stepLength}
                    onChange={setStepLength}
                    placeholder={`About ${estimatedStep}`}
                    keyboard="number-pad"
                  />
                  <Text style={styles.fieldHint}>
                    Most people’s step length is about 41% of their height.
                    {heightFt
                      ? ` Based on your height, that is about ${estimatedStep} inches.`
                      : ''}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {step === 'welcome' ? (
              <Button
                label="Continue"
                size="lg"
                full
                iconRight="arrow-right"
                onPress={() => setStep('name')}
              />
            ) : null}

            {step === 'name' ? (
              <View style={styles.navRow}>
                <Button label="Back" variant="ghost" onPress={() => setStep('welcome')} />
                <Button
                  label="Continue"
                  iconRight="arrow-right"
                  disabled={!canProceedName}
                  onPress={() => setStep('body')}
                  style={{ flex: 1 }}
                  size="lg"
                />
              </View>
            ) : null}

            {step === 'body' ? (
              <View style={styles.navRow}>
                <Button label="Back" variant="ghost" onPress={() => setStep('name')} />
                <Button
                  label="Continue"
                  iconRight="arrow-right"
                  disabled={!canProceedBody}
                  onPress={() => setStep('activity')}
                  style={{ flex: 1 }}
                  size="lg"
                />
              </View>
            ) : null}

            {step === 'activity' ? (
              <View style={styles.navRow}>
                <Button label="Back" variant="ghost" onPress={() => setStep('body')} />
                <Button
                  label="Finish setup"
                  iconRight="check"
                  loading={busy}
                  onPress={handleComplete}
                  style={{ flex: 1 }}
                  size="lg"
                />
              </View>
            ) : null}
          </View>
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
  onFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'number-pad';
  autoFocus?: boolean;
  onFocus?: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        keyboardType={keyboard ?? 'default'}
        autoFocus={autoFocus}
        onFocus={onFocus}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

function BenefitRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Icon name={icon} size={18} color={COLORS.primary} strokeWidth={2} />
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
      {done ? <Icon name="check" size={12} color="#fff" strokeWidth={3} /> : null}
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
    paddingBottom: 40,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 0,
  },
  progressDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: COLORS.primary, width: 18, height: 18, borderRadius: 9 },
  progressDotDone: { backgroundColor: COLORS.primary },
  progressLine: { width: 28, height: 3, backgroundColor: COLORS.borderStrong },

  stepContent: { gap: SPACING.lg, alignItems: 'center', paddingTop: SPACING.sm },
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
    maxWidth: 360,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flex: 1 },

  form: { width: '100%', gap: SPACING.lg },
  fieldLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  fieldHint: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    minHeight: 56,
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
  },
  inputHint: { ...TYPOGRAPHY.small, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  heightRow: { flexDirection: 'row', gap: SPACING.md },

  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, width: '100%' },
});
