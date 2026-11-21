import { act, cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { LoginScreen } from '@/features/auth/components/LoginScreen';
import { ProfileScreen } from '@/features/auth/components/ProfileScreen';
import { configureAuthTransport, useAuth } from '@/features/auth/hooks/useAuth';
import { clearSession, loadSession } from '@/features/auth/services/sessionStorage';
import { AppError } from '@/shared/api/types';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/shared/storage/seedData';
import { renderWithProviders, setupTestEnvironment, teardownTestEnvironment } from '@/test/utils';

const originalHydrate = useAuth.getState().hydrate;

describe('ProfileScreen and Auth flow', () => {
  beforeEach(async () => {
    useAuth.setState({ hydrate: originalHydrate });
    await clearSession();
  });

  afterEach(async () => {
    await cleanup();
    useAuth.setState({ hydrate: originalHydrate });
    await clearSession();
    teardownTestEnvironment();
  });

  it('renders a loading state while auth session is hydrating', async () => {
    setupTestEnvironment();
    useAuth.setState({ status: 'loading', employee: null, error: null });

    const screen = await renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
    expect(screen.getByText('Loading your profile…')).toBeTruthy();
  });

  it('renders a retryable error state when profile could not be loaded', async () => {
    setupTestEnvironment();
    const hydrate = jest.fn(async () => undefined);
    useAuth.setState({
      status: 'unauthenticated',
      employee: null,
      error: new AppError('NETWORK_ERROR', 'Network unavailable.'),
      hydrate,
    });

    const screen = await renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.getByText("Couldn't load your profile")).toBeTruthy();

    await fireEvent.press(screen.getByTestId('retry-button'));
    expect(hydrate).toHaveBeenCalledTimes(1);
  });

  it('signs in through LoginScreen, persists to SecureStore, hydrates, and signs out cleanly', async () => {
    setupTestEnvironment();
    configureAuthTransport();

    const loginScreen = await renderWithProviders(<LoginScreen />);
    expect(loginScreen.getByTestId('login-hint')).toBeTruthy();

    // Validation error for empty/bad fields.
    await fireEvent.changeText(loginScreen.getByTestId('login-email'), 'not-an-email');
    await fireEvent.press(loginScreen.getByTestId('login-submit'));
    expect(await loginScreen.findByTestId('login-email-error')).toBeTruthy();

    // Unauthorized error for wrong password.
    await fireEvent.changeText(loginScreen.getByTestId('login-email'), DEMO_EMAIL);
    await fireEvent.changeText(loginScreen.getByTestId('login-password'), 'wrong');
    await fireEvent.press(loginScreen.getByTestId('login-submit'));
    expect(await loginScreen.findByTestId('login-error')).toBeTruthy();

    // Valid sign-in stores session in SecureStore.
    await fireEvent.changeText(loginScreen.getByTestId('login-password'), DEMO_PASSWORD);
    await fireEvent.press(loginScreen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(useAuth.getState().status).toBe('authenticated');
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
    expect((await loadSession())?.employee.email).toBe(DEMO_EMAIL);

    // Hydrating in a fresh state restores the authenticated employee from SecureStore.
    await loginScreen.unmount();
    await act(async () => {
      useAuth.setState({ status: 'loading', employee: null, error: null });
      await useAuth.getState().hydrate();
    });
    expect(useAuth.getState().status).toBe('authenticated');
    expect(useAuth.getState().employee?.name).toBe('Alex Nguyen');

    // ProfileScreen displays the signed-in employee, standalone dev controls, and Sign out.
    const profileScreen = await renderWithProviders(<ProfileScreen />);
    expect(profileScreen.getByTestId('profile-name').props.children).toBe('Alex Nguyen');
    expect(profileScreen.getByTestId('profile-email').props.children).toBe(DEMO_EMAIL);
    expect(profileScreen.getByTestId('dev-controls')).toBeTruthy();

    // Standalone reset and failure controls work cleanly.
    await fireEvent.press(profileScreen.getByTestId('toggle-network-failure'));
    expect(profileScreen.getByTestId('dev-controls-message').props.children).toMatch(/simulated/i);
    await fireEvent.press(profileScreen.getByTestId('toggle-network-failure'));
    await fireEvent.press(profileScreen.getByTestId('reset-mock-data'));
    expect(await profileScreen.findByText('Sample data was reset.')).toBeTruthy();

    // Sign out clears SecureStore and transitions to unauthenticated.
    await fireEvent.press(profileScreen.getByTestId('logout'));
    await waitFor(() => {
      expect(useAuth.getState().status).toBe('unauthenticated');
    });
    expect(await loadSession()).toBeNull();
  });

  it('surfaces network failures on login without authenticating', async () => {
    const adapter = setupTestEnvironment();
    adapter.controls.setFailureMode('network');

    const screen = await renderWithProviders(<LoginScreen />);
    await fireEvent.changeText(screen.getByTestId('login-email'), DEMO_EMAIL);
    await fireEvent.changeText(screen.getByTestId('login-password'), DEMO_PASSWORD);
    await fireEvent.press(screen.getByTestId('login-submit'));

    expect(await screen.findByTestId('login-error')).toBeTruthy();
    expect(useAuth.getState().status).toBe('unauthenticated');
  });
});
