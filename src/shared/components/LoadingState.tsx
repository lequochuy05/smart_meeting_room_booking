import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/shared/components/theme';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.container} testID="loading-state" accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  text: { color: colors.textMuted, fontSize: 15 },
});
