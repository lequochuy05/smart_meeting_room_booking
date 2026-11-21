import { fireEvent, renderRouter, waitFor } from 'expo-router/testing-library';

import { clearSession } from '@/features/auth/services/sessionStorage';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/shared/storage/seedData';
import { setupTestEnvironment, teardownTestEnvironment } from '@/test/utils';

describe('App navigation entry', () => {
  beforeEach(async () => {
    await clearSession();
    setupTestEnvironment();
  });

  afterEach(async () => {
    await clearSession();
    teardownTestEnvironment();
  });

  it('opens on the login screen when unauthenticated and enters Rooms after sign-in', async () => {
    const screen = await renderRouter('./src/app');

    expect(await screen.findByTestId('login-screen')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('login-email'), DEMO_EMAIL);
    await fireEvent.changeText(screen.getByTestId('login-password'), DEMO_PASSWORD);
    await fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(screen.getByText('Orion')).toBeTruthy();
    });
  });
});
