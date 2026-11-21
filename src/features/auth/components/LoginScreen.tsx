import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { Field } from '@/shared/components/Field';
import { colors, spacing } from '@/shared/components/theme';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/shared/storage/seedData';
import { isMockHint } from '@/features/auth/components/mockHint';

export function LoginScreen() {
  const { login, isSubmitting, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container} testID="login-screen">
      <Text style={styles.title}>Smart Room Booking</Text>
      <Text style={styles.subtitle}>Sign in with your company account</Text>
      <Field
        label="Email"
        testID="login-email"
        value={email}
        onChangeText={(value) => {
          clearError();
          setEmail(value);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={error?.fieldErrors?.email}
      />
      <Field
        label="Password"
        testID="login-password"
        value={password}
        onChangeText={(value) => {
          clearError();
          setPassword(value);
        }}
        secureTextEntry
        error={error?.fieldErrors?.password}
      />
      {error && !error.fieldErrors ? (
        <Text style={styles.error} testID="login-error" accessibilityRole="alert">
          {error.message}
        </Text>
      ) : null}
      <Button
        title="Sign in"
        testID="login-submit"
        loading={isSubmitting}
        onPress={() => void login({ email, password })}
      />
      {isMockHint() ? (
        <Text style={styles.hint} testID="login-hint">
          Demo account: {DEMO_EMAIL} / {DEMO_PASSWORD}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, marginBottom: spacing.md },
  error: { color: colors.danger },
  hint: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
