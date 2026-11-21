import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/shared/components/Button';
import { colors, radius, spacing } from '@/shared/components/theme';
import {
  getSimulatedFailure,
  isStandaloneMode,
  resetMockData,
  setSimulatedFailure,
} from '@/shared/storage/mockDataControls';

/** Standalone-mode validation tools: re-seed persisted data and simulate network failure. */
export function DevControls() {
  const [failing, setFailing] = useState(getSimulatedFailure() !== 'none');
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isStandaloneMode()) return null;

  const toggleFailure = () => {
    const next = !failing;
    setSimulatedFailure(next ? 'network' : 'none');
    setFailing(next);
    setMessage(next ? 'Network failures are now simulated.' : 'Network is back to normal.');
  };

  const reset = async () => {
    setResetting(true);
    try {
      await resetMockData();
      setMessage('Sample data was reset.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <View style={styles.container} testID="dev-controls">
      <Text style={styles.title}>Standalone data tools</Text>
      <Text style={styles.text}>Using local sample data stored on this device.</Text>
      <Button
        title={failing ? 'Stop simulating network failure' : 'Simulate network failure'}
        variant="secondary"
        onPress={toggleFailure}
        testID="toggle-network-failure"
      />
      <Button title="Reset sample data" variant="secondary" onPress={() => void reset()} loading={resetting} testID="reset-mock-data" />
      {message ? (
        <Text style={styles.text} testID="dev-controls-message">
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontWeight: '700', color: colors.text },
  text: { color: colors.textMuted, fontSize: 13 },
});
