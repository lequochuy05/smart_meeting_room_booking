import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/shared/components/Button';
import { colors, spacing } from '@/shared/components/theme';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container} testID="empty-state">
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} variant="secondary" onPress={onAction} testID="empty-action" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { color: colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  message: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: spacing.sm },
});
