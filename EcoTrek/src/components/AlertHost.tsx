import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertRequest, registerAlertHost } from '../services/alert';
import { RADIUS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

/**
 * Renders whatever `alert(...)` (src/services/alert.ts) asks for. Mounted
 * once near the app root — see App.tsx. Without this mounted, `alert()`
 * falls back to a bare `window.confirm`, so every screen should assume this
 * is present rather than calling react-native's `Alert.alert` directly.
 */
export default function AlertHost() {
  const { colors, typography } = useTheme();
  const [request, setRequest] = useState<AlertRequest | null>(null);

  useEffect(() => {
    registerAlertHost(setRequest);
    return () => registerAlertHost(null);
  }, []);

  const close = (onPress?: () => void) => {
    setRequest(null);
    // Let the modal's close animation start before firing the handler, so a
    // navigation triggered by onPress doesn't fight the dismiss.
    if (onPress) setTimeout(onPress, 0);
  };

  const visible = !!request;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close()}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
        <SafeAreaView style={styles.wrap} pointerEvents="box-none">
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {request ? (
              <>
                <Text style={[typography.h3, { color: colors.text }]}>{request.title}</Text>
                {request.message ? (
                  <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8 }]}>
                    {request.message}
                  </Text>
                ) : null}
                <View style={styles.buttons}>
                  {request.buttons.map((b, i) => {
                    const isCancel = b.style === 'cancel';
                    const isDestructive = b.style === 'destructive';
                    return (
                      <Pressable
                        key={`${b.text}-${i}`}
                        onPress={() => close(b.onPress)}
                        style={({ pressed }) => [
                          styles.button,
                          {
                            backgroundColor: isCancel
                              ? colors.surfaceSunken
                              : isDestructive
                              ? colors.dangerLight
                              : colors.primarySurface,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={b.text}
                      >
                        <Text
                          style={[
                            typography.bodyMed,
                            {
                              color: isCancel
                                ? colors.textSecondary
                                : isDestructive
                                ? colors.danger
                                : colors.primary,
                            },
                          ]}
                        >
                          {b.text}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  wrap: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: 4,
  },
  buttons: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  button: {
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
