import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { DevControls } from '@/shared/components/DevControls';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { colors, radius, spacing } from '@/shared/components/theme';

export function ProfileScreen() {
  const { status, employee, error, isSubmitting, logout, hydrate } = useAuth();

  if (status === 'loading') return <LoadingState message="Loading your profile…" />;
  if (!employee) {
    return <ErrorState error={error ?? undefined} title="Couldn't load your profile" onRetry={() => void hydrate()} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} testID="profile-screen">
      <View style={styles.card}>
        <Text style={styles.name} testID="profile-name">
          {employee.name}
        </Text>
        <Text style={styles.email} testID="profile-email">
          {employee.email}
        </Text>
      </View>
      {error ? (
        <Text style={styles.error} testID="profile-error" accessibilityRole="alert">
          {error.message}
        </Text>
      ) : null}
      <Button title="Sign out" variant="danger" onPress={() => void logout()} loading={isSubmitting} testID="logout" />
      <DevControls />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { color: colors.textMuted },
  error: { color: colors.danger },
});
