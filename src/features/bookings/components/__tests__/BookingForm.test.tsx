import { fireEvent, waitFor } from '@testing-library/react-native';

import { BookingForm } from '@/features/bookings/components/BookingForm';
import { useBookingDraftStore } from '@/features/bookings/hooks/useBookingDraft';
import { combineDateAndTime } from '@/shared/utils/dateTime';
import {
  createTestQueryClient,
  renderWithProviders,
  setupTestEnvironment,
  teardownTestEnvironment,
} from '@/test/utils';

const TODAY = '2026-11-21';
const TOMORROW = '2026-11-22';

describe('BookingForm', () => {
  afterEach(teardownTestEnvironment);

  it('creates a booking with prefilled slot and directory participants', async () => {
    const adapter = setupTestEnvironment();
    const onCreated = jest.fn();

    const screen = await renderWithProviders(
      <BookingForm
        roomId="room-vega"
        roomName="Vega"
        initialValues={{ date: TODAY, startTime: '13:00', endTime: '14:00' }}
        onCreated={onCreated}
      />,
    );

    expect(screen.getByTestId('booking-date').props.value).toBe(TODAY);
    expect(screen.getByTestId('booking-start').props.value).toBe('13:00');
    expect(screen.getByTestId('booking-end').props.value).toBe('14:00');

    await fireEvent.changeText(screen.getByTestId('booking-title'), 'Architecture Sync');
    await fireEvent.changeText(screen.getByTestId('participant-search'), 'binh');
    const option = await screen.findByTestId('participant-option-emp-2');
    await fireEvent.press(option);
    expect(screen.getByTestId('remove-participant-emp-2')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('submit-booking'));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: 'room-vega',
        title: 'Architecture Sync',
        startTime: combineDateAndTime(TODAY, '13:00'),
        endTime: combineDateAndTime(TODAY, '14:00'),
        participantIds: ['emp-2'],
        status: 'UPCOMING',
      }),
    );

    // Draft is cleared after confirmed success and booking appears in Upcoming.
    expect(useBookingDraftStore.getState().drafts['room-vega']).toBeUndefined();
    const upcoming = await adapter.listMyBookings('upcoming');
    expect(upcoming.some((b) => b.title === 'Architecture Sync')).toBe(true);
  });

  it('validates missing title, invalid ranges, and past times while preserving entered fields', async () => {
    setupTestEnvironment();
    const onCreated = jest.fn();

    const screen = await renderWithProviders(
      <BookingForm
        roomId="room-vega"
        roomName="Vega"
        initialValues={{ date: TODAY, startTime: '14:00', endTime: '13:00' }}
        onCreated={onCreated}
      />,
    );

    await fireEvent.press(screen.getByTestId('submit-booking'));
    expect(await screen.findByTestId('booking-title-error')).toBeTruthy();
    expect(screen.getByTestId('booking-end-error')).toBeTruthy();

    // Entered values are preserved across validation failure.
    expect(screen.getByTestId('booking-date').props.value).toBe(TODAY);
    expect(screen.getByTestId('booking-start').props.value).toBe('14:00');
    expect(screen.getByTestId('booking-end').props.value).toBe('13:00');

    // Past start time is also rejected.
    await fireEvent.changeText(screen.getByTestId('booking-title'), 'Early Standup');
    await fireEvent.changeText(screen.getByTestId('booking-start'), '07:00');
    await fireEvent.changeText(screen.getByTestId('booking-end'), '08:00');
    await fireEvent.press(screen.getByTestId('submit-booking'));

    expect(await screen.findByTestId('booking-start-error')).toBeTruthy();
    expect(screen.getByTestId('booking-title').props.value).toBe('Early Standup');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('warns immediately on local overlap and blocks submission until corrected', async () => {
    setupTestEnvironment();
    const onCreated = jest.fn();

    // Nova already has "Quarterly review" on 2026-11-22 10:00-11:00.
    const screen = await renderWithProviders(
      <BookingForm
        roomId="room-nova"
        roomName="Nova"
        initialValues={{ date: TOMORROW, startTime: '10:30', endTime: '11:30' }}
        onCreated={onCreated}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('booking-title'), 'Conflicting Sync');
    expect(await screen.findByTestId('conflict-warning')).toBeTruthy();
    expect(screen.getByTestId('submit-booking').props.accessibilityState.disabled).toBe(true);

    // Correcting to an adjacent non-overlapping slot clears the warning and enables submission.
    await fireEvent.changeText(screen.getByTestId('booking-start'), '11:00');
    await fireEvent.changeText(screen.getByTestId('booking-end'), '12:00');
    await waitFor(() => {
      expect(screen.queryByTestId('conflict-warning')).toBeNull();
    });
    expect(screen.getByTestId('submit-booking').props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(screen.getByTestId('submit-booking'));
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });
  });

  it('revalidates against fresh availability on submit when a concurrent conflict appears', async () => {
    const adapter = setupTestEnvironment();
    const queryClient = createTestQueryClient();
    const onCreated = jest.fn();

    const screen = await renderWithProviders(
      <BookingForm
        roomId="room-vega"
        roomName="Vega"
        initialValues={{ date: TODAY, startTime: '15:00', endTime: '16:00' }}
        onCreated={onCreated}
      />,
      queryClient,
    );

    await fireEvent.changeText(screen.getByTestId('booking-title'), 'Late Sync');
    // Wait for initial (empty) schedule load.
    await waitFor(() => {
      expect(screen.getByTestId('submit-booking').props.accessibilityState.disabled).toBe(false);
    });

    // Another booking is written behind the cache's back before submission.
    await adapter.createBooking({
      roomId: 'room-vega',
      title: 'Grabbed First',
      startTime: combineDateAndTime(TODAY, '15:00'),
      endTime: combineDateAndTime(TODAY, '16:00'),
      participantIds: [],
    });

    await fireEvent.press(screen.getByTestId('submit-booking'));

    expect(await screen.findByTestId('conflict-warning')).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
    // Title is preserved so the employee can pick a new time without retyping.
    expect(screen.getByTestId('booking-title').props.value).toBe('Late Sync');
  });

  it('preserves entered fields across network failures and succeeds on Retry', async () => {
    const adapter = setupTestEnvironment();
    const onCreated = jest.fn();

    const screen = await renderWithProviders(
      <BookingForm
        roomId="room-vega"
        roomName="Vega"
        initialValues={{ date: TODAY, startTime: '16:00', endTime: '17:00' }}
        onCreated={onCreated}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('booking-title'), 'Release Prep');
    await fireEvent.changeText(screen.getByTestId('participant-search'), 'chi');
    await fireEvent.press(await screen.findByTestId('participant-option-emp-3'));

    adapter.controls.setFailureMode('network');
    await fireEvent.press(screen.getByTestId('submit-booking'));

    expect(await screen.findByTestId('submit-error')).toBeTruthy();
    expect(screen.getByTestId('submit-retry')).toBeTruthy();
    expect(screen.getByTestId('booking-title').props.value).toBe('Release Prep');
    expect(screen.getByTestId('remove-participant-emp-3')).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();

    adapter.controls.setFailureMode('none');
    await fireEvent.press(screen.getByTestId('submit-retry'));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Release Prep',
          participantIds: ['emp-3'],
        }),
      );
    });
  });

  it('shows an empty message when no employee matches the participant search', async () => {
    setupTestEnvironment();
    const screen = await renderWithProviders(
      <BookingForm
        roomId="room-vega"
        initialValues={{ date: TODAY, startTime: '16:00', endTime: '17:00' }}
        onCreated={jest.fn()}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('participant-search'), 'external@guest.io');
    expect(await screen.findByTestId('participant-empty')).toBeTruthy();
  });
});
