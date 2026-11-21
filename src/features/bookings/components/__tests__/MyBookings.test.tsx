import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { MyBookingsScreen } from '@/features/bookings/components/MyBookingsScreen';
import { setApiAdapter } from '@/shared/api';
import {
  TEST_EMPLOYEE_ID,
  renderWithProviders,
  setupTestEnvironment,
  teardownTestEnvironment,
} from '@/test/utils';

describe('MyBookingsScreen', () => {
  afterEach(teardownTestEnvironment);

  it('shows loading state then lists Upcoming and Past meetings in chronological order', async () => {
    const adapter = setupTestEnvironment();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const listMyBookings = adapter.listMyBookings.bind(adapter);
    setApiAdapter({
      ...adapter,
      listMyBookings: async (status) => {
        await gate;
        return listMyBookings(status);
      },
    });

    const screen = await renderWithProviders(<MyBookingsScreen currentEmployeeId={TEST_EMPLOYEE_ID} />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();

    await act(async () => {
      release();
      await Promise.resolve();
    });

    expect(await screen.findByText('Design sync')).toBeTruthy();
    expect(screen.getByText('Quarterly review')).toBeTruthy();
    expect(screen.getByText('Platform architecture review')).toBeTruthy();

    // Switch to Past tab.
    await fireEvent.press(screen.getByTestId('segment-past'));
    expect(await screen.findByText('Sprint retrospective')).toBeTruthy();
    expect(screen.getByText('One-on-one (cancelled)')).toBeTruthy();
  });

  it('allows check-in inside the 15-minute window and disables ineligible actions with explanations', async () => {
    setupTestEnvironment();
    const screen = await renderWithProviders(<MyBookingsScreen currentEmployeeId={TEST_EMPLOYEE_ID} />);
    expect(await screen.findByText('Design sync')).toBeTruthy();

    // bk-seed-4 is tomorrow: check-in disabled with explanation, cancel enabled.
    expect(screen.getByTestId('check-in-bk-seed-4').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('check-in-reason-bk-seed-4').props.children).toMatch(/15 minutes before/i);
    expect(screen.getByTestId('cancel-bk-seed-4').props.accessibilityState.disabled).toBe(false);

    // bk-seed-1 is owned by emp-2: both check-in and cancel disabled for emp-1.
    expect(screen.getByTestId('check-in-bk-seed-1').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('cancel-bk-seed-1').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('check-in-reason-bk-seed-1').props.children).toMatch(/organizer/i);

    // bk-seed-2 starts in 10 minutes and is owned by emp-1: check-in succeeds and shows confirmation.
    expect(screen.getByTestId('check-in-bk-seed-2').props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(screen.getByTestId('check-in-bk-seed-2'));

    expect(await screen.findByTestId('action-feedback')).toBeTruthy();
    expect(screen.getByText(/checked in to "Design sync"/i)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Checked in ✓')).toBeTruthy();
    });
  });

  it('requires confirmation before cancellation and moves the meeting out of Upcoming once confirmed', async () => {
    setupTestEnvironment();
    const screen = await renderWithProviders(<MyBookingsScreen currentEmployeeId={TEST_EMPLOYEE_ID} />);
    expect(await screen.findByText('Quarterly review')).toBeTruthy();

    // Open confirmation and abort first.
    await fireEvent.press(screen.getByTestId('cancel-bk-seed-4'));
    expect(screen.getByTestId('cancel-confirm-bk-seed-4')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('cancel-keep-bk-seed-4'));
    expect(screen.queryByTestId('cancel-confirm-bk-seed-4')).toBeNull();
    expect(screen.getByText('Quarterly review')).toBeTruthy();

    // Confirm cancellation.
    await fireEvent.press(screen.getByTestId('cancel-bk-seed-4'));
    await fireEvent.press(screen.getByTestId('cancel-confirm-yes-bk-seed-4'));

    expect(await screen.findByText('"Quarterly review" was cancelled.')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByTestId('meeting-bk-seed-4')).toBeNull();
    });

    // Cancelled meeting is now visible in Past.
    await fireEvent.press(screen.getByTestId('segment-past'));
    expect(await screen.findByText('Quarterly review')).toBeTruthy();
  });

  it('shows an empty state when the employee has no meetings in a category', async () => {
    setupTestEnvironment({ token: 'mock-token.emp-8' });
    const screen = await renderWithProviders(<MyBookingsScreen currentEmployeeId="emp-8" />);

    expect(await screen.findByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('No upcoming meetings')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('segment-past'));
    expect(await screen.findByText('No past meetings')).toBeTruthy();
  });

  it('shows a retryable network error state and recovers on Retry', async () => {
    const adapter = setupTestEnvironment();
    adapter.controls.setFailureMode('network');

    const screen = await renderWithProviders(<MyBookingsScreen currentEmployeeId={TEST_EMPLOYEE_ID} />);
    expect(await screen.findByTestId('error-state')).toBeTruthy();
    expect(screen.getByText("Couldn't load your meetings")).toBeTruthy();

    adapter.controls.setFailureMode('none');
    await fireEvent.press(screen.getByTestId('retry-button'));
    expect(await screen.findByText('Design sync')).toBeTruthy();
  });
});
