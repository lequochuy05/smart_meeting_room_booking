import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/shared/components/Button';
import { colors, spacing } from '@/shared/components/theme';
import { toAppError } from '@/shared/api/types';

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({ error, title = 'Something went wrong', onRetry, retrying = false }: ErrorStateProps) {
  const message = error ? toAppError(error).message : 'Please try again.';
  return (
    <View style={styles.container} testID="error-state" accessibilityRole="alert">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button title="Retry" onPress={onRetry} loading={retrying} testID="retry-button" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { color: colors.danger, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  message: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: spacing.sm },
});
