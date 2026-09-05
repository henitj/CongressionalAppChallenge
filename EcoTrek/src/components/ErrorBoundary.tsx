import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SUPPORT_EMAIL } from '../constants/appInfo';

/**
 * The last-resort safety net.
 *
 * Every screen renders inside this boundary, so if any screen ever throws
 * while rendering, the app shows this calm screen instead of vanishing. The
 * person can retry (which recovers from transient errors) and, if it keeps
 * happening, email the team — the error text is right there to copy.
 *
 * It is deliberately a class component: error boundaries are the one thing
 * React still requires classes for.
 *
 * The fallback is intentionally SELF-CONTAINED: no theme, no icons, no
 * context of any kind. If the boundary is showing, some provider above may
 * be the thing that crashed, so the fallback must be able to render with
 * nothing but React Native itself.
 */

type Props = { children: React.ReactNode };

type State = { error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface for logs; must never itself throw.
    try {
      console.error('[ErrorBoundary]', error.message, info.componentStack ?? '');
    } catch {
      /* ignore */
    }
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <Fallback error={this.state.error} onRetry={this.retry} />;
  }
}

function Fallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <View style={styles.root}>
      <View style={styles.mark}>
        <Text style={styles.markText}>!</Text>
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>
        The app hit an unexpected problem. Your walks are safe. Try again — if it keeps happening,
        please tell the team.
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
      <ScrollView style={styles.details} scrollEnabled>
        <Text style={styles.errorText}>{error.message}</Text>
        <Text style={styles.errorText}>{SUPPORT_EMAIL}</Text>
      </ScrollView>
    </View>
  );
}

/* Hard-coded neutral palette — no theme context available in a crash state. */
const INK = '#1F2933';
const MUTED = '#52606D';
const GREEN = '#1A7A5A';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  mark: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#EAF4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: GREEN,
    fontSize: 34,
    fontWeight: '700',
  },
  title: {
    color: INK,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  body: {
    color: MUTED,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    marginTop: 24,
    minWidth: 220,
    backgroundColor: GREEN,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  details: {
    marginTop: 20,
    maxHeight: 120,
    alignSelf: 'stretch',
  },
  errorText: {
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
  },
});
