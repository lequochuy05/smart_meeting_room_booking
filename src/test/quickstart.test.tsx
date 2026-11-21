import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { BookingForm } from '@/features/bookings/components/BookingForm';
import { MyBookingsScreen } from '@/features/bookings/components/MyBookingsScreen';
import { RoomDetailScreen } from '@/features/rooms/components/RoomDetailScreen';
import { RoomSearchScreen } from '@/features/rooms/components/RoomSearchScreen';
import type { SelectedSlotRange } from '@/features/rooms/components/RoomTimeline';
import { setApiAdapter } from '@/shared/api';
import { createMemoryStorage, createMockAdapter } from '@/shared/api/mockAdapter';
import { resetMockData } from '@/shared/storage/mockDataControls';
import {
  TEST_EMPLOYEE_ID,
  TEST_NOW,
  TEST_TOKEN,
  createTestQueryClient,
  renderWithProviders,
  setupTestEnvironment,
  teardownTestEnvironment,
} from '@/test/utils';

describe('Quickstart end-to-end validation scenarios', () => {
  afterEach(teardownTestEnvironment);

  it('walks through search -> timeline -> booking creation -> persistence -> overlap rejection -> check-in & cancellation', async () => {
    const storage = createMemoryStorage();
    const createStandalone = () =>
      createMockAdapter({
        storage,
        now: () => TEST_NOW,
        getToken: async () => TEST_TOKEN,
      });

    setupTestEnvironment();
    const adapter = createStandalone();
    setApiAdapter(adapter);
    const queryClient = createTestQueryClient();

    // 1. Room Search: filter by capacity and equipment, verify only matching rooms appear.
    let openedRoomId: string | null = null;
    const searchScreen = await renderWithProviders(
      <RoomSearchScreen onOpenRoom={(id) => (openedRoomId = id)} />,
      queryClient,
    );
    await waitFor(() => {
      expect(searchScreen.getByText('Orion')).toBeTruthy();
      expect(searchScreen.getByTestId('equipment-eq-whiteboard')).toBeTruthy();
    });

    await fireEvent.press(searchScreen.getByTestId('capacity-8'));
    await fireEvent.press(searchScreen.getByTestId('equipment-eq-whiteboard'));
    await waitFor(() => {
      expect(searchScreen.getByText('Atlas')).toBeTruthy();
      expect(searchScreen.queryByText('Nova')).toBeNull();
      expect(searchScreen.queryByText('Vega')).toBeNull();
    });
    await fireEvent.press(searchScreen.getByTestId('room-card-room-atlas'));
    expect(openedRoomId).toBe('room-atlas');
    await searchScreen.unmount();

    // 2. Room Timeline: open Atlas, inspect timeline, select an available slot adjacent to booked period.
    let selectedRange: SelectedSlotRange | null = null;
    const detailScreen = await renderWithProviders(
      <RoomDetailScreen roomId="room-atlas" now={TEST_NOW} onBook={(range) => (selectedRange = range)} />,
      queryClient,
    );
    expect(await detailScreen.findByTestId('room-timeline')).toBeTruthy();
    // Atlas has "Hiring sync" 09:40-10:40; 11:00-11:30 and 11:30-12:00 are available.
    expect(detailScreen.getByTestId('slot-10:00').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(detailScreen.getByTestId('slot-11:00'));
    await fireEvent.press(detailScreen.getByTestId('slot-11:30'));
    await fireEvent.press(detailScreen.getByTestId('book-selected'));
    expect(selectedRange).toEqual({
      roomId: 'room-atlas',
      date: '2026-11-21',
      startTime: '11:00',
      endTime: '12:00',
    });
    await detailScreen.unmount();

    // 3. Booking Creation: create a booking with employee participant, confirm it persists after app reopen.
    const onCreated = jest.fn();
    const formScreen = await renderWithProviders(
      <BookingForm
        roomId="room-atlas"
        roomName="Atlas"
        initialValues={selectedRange!}
        onCreated={onCreated}
      />,
      queryClient,
    );
    await fireEvent.changeText(formScreen.getByTestId('booking-title'), 'Quickstart Demo');
    await fireEvent.changeText(formScreen.getByTestId('participant-search'), 'binh');
    await fireEvent.press(await formScreen.findByTestId('participant-option-emp-2'));
    await fireEvent.press(formScreen.getByTestId('submit-booking'));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });
    await formScreen.unmount();

    // Reopen app: mount fresh adapter and queryClient reading from the same persisted storage.
    const reopenedAdapter = createStandalone();
    setApiAdapter(reopenedAdapter);
    const reopenedClient = createTestQueryClient();

    // Repeating an overlapping range on Atlas is immediately blocked.
    const overlapScreen = await renderWithProviders(
      <BookingForm
        roomId="room-atlas"
        roomName="Atlas"
        initialValues={{ date: '2026-11-21', startTime: '11:30', endTime: '12:30' }}
        onCreated={jest.fn()}
      />,
      reopenedClient,
    );
    expect(await overlapScreen.findByTestId('conflict-warning')).toBeTruthy();
    expect(overlapScreen.getByTestId('submit-booking').props.accessibilityState.disabled).toBe(true);
    await overlapScreen.unmount();

    // 4. My Bookings: newly booked meeting appears in Upcoming; check-in eligible meeting; cancel cancellable meeting.
    const bookingsScreen = await renderWithProviders(
      <MyBookingsScreen currentEmployeeId={TEST_EMPLOYEE_ID} />,
      reopenedClient,
    );
    expect(await bookingsScreen.findByText('Quickstart Demo')).toBeTruthy();

    // Check in to Design sync (starts in 10 min, inside +-15 min window).
    await fireEvent.press(bookingsScreen.getByTestId('check-in-bk-seed-2'));
    expect(await bookingsScreen.findByText(/checked in to "Design sync"/i)).toBeTruthy();

    // Cancel Quarterly review after confirmation.
    await fireEvent.press(bookingsScreen.getByTestId('cancel-bk-seed-4'));
    await fireEvent.press(bookingsScreen.getByTestId('cancel-confirm-yes-bk-seed-4'));
    expect(await bookingsScreen.findByText('"Quarterly review" was cancelled.')).toBeTruthy();

    // Standalone reset restores seed data cleanly.
    await act(async () => {
      await resetMockData();
    });
    const resetUpcoming = await reopenedAdapter.listMyBookings('upcoming');
    expect(resetUpcoming.some((b) => b.title === 'Quickstart Demo')).toBe(false);
    expect(resetUpcoming.some((b) => b.id === 'bk-seed-4')).toBe(true);
  });
});
