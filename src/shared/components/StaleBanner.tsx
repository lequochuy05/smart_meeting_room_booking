import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/shared/components/Button';
import { colors, radius, spacing } from '@/shared/components/theme';

interface StaleBannerProps {
  onRetry: () => void;
  retrying?: boolean;
  message?: string;
}

/** Shown above previously cached data when the latest refresh failed. */
export function StaleBanner({
  onRetry,
  retrying = false,
  message = 'Could not refresh. Showing saved data that may be out of date.',
}: StaleBannerProps) {
  return (
    <View style={styles.container} testID="stale-banner" accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
      <Button title="Retry" variant="secondary" onPress={onRetry} loading={retrying} testID="stale-retry-button" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    margin: spacing.md,
    gap: spacing.sm,
  },
  text: { color: colors.warning, fontSize: 14 },
});
