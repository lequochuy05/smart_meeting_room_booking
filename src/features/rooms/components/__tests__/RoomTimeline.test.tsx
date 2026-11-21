import { fireEvent, waitFor } from '@testing-library/react-native';

import { RoomDetailScreen } from '@/features/rooms/components/RoomDetailScreen';
import { RoomTimeline } from '@/features/rooms/components/RoomTimeline';
import type { RoomSchedule } from '@/features/rooms/types/room';
import { combineDateAndTime } from '@/shared/utils/dateTime';
import { TEST_NOW, renderWithProviders, setupTestEnvironment, teardownTestEnvironment } from '@/test/utils';

const DATE = '2026-11-21';
const at = (time: string) => combineDateAndTime(DATE, time);

const schedule: RoomSchedule = {
  roomId: 'room-orion',
  date: DATE,
  bookings: [
    {
      id: 'bk-1',
      roomId: 'room-orion',
      roomName: 'Orion',
      ownerId: 'emp-2',
      title: 'Architecture Review',
      startTime: at('10:00'),
      endTime: at('11:00'),
      participantIds: [],
      status: 'UPCOMING',
    },
  ],
  availableSlots: [],
};

describe('RoomTimeline', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });
  afterEach(teardownTestEnvironment);

  it('distinguishes past, booked, and available 30-minute slots', async () => {
    const screen = await renderWithProviders(<RoomTimeline schedule={schedule} now={TEST_NOW} onBook={jest.fn()} />);

    expect(screen.getByTestId('slot-08:00').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('slot-10:00').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('slot-10:30').props.accessibilityState.disabled).toBe(true);
    expect(screen.getAllByText('Architecture Review')).toHaveLength(2);

    // Adjacent non-overlapping slots remain selectable.
    expect(screen.getByTestId('slot-09:30').props.accessibilityState.disabled).toBe(false);
    expect(screen.getByTestId('slot-11:00').props.accessibilityState.disabled).toBe(false);
  });

  it('selects an available slot, extends to an adjacent slot, and prefills booking entry', async () => {
    const onBook = jest.fn();
    const screen = await renderWithProviders(<RoomTimeline schedule={schedule} now={TEST_NOW} onBook={onBook} />);

    expect(screen.queryByTestId('book-selected')).toBeNull();

    await fireEvent.press(screen.getByTestId('slot-11:00'));
    expect(screen.getByTestId('selection-summary').props.children.join('')).toBe('11:00–11:30');

    // Extend to adjacent slot.
    await fireEvent.press(screen.getByTestId('slot-11:30'));
    expect(screen.getByTestId('selection-summary').props.children.join('')).toBe('11:00–12:00');

    await fireEvent.press(screen.getByTestId('book-selected'));
    expect(onBook).toHaveBeenCalledWith({
      roomId: 'room-orion',
      date: DATE,
      startTime: '11:00',
      endTime: '12:00',
    });
  });

  it('cannot select booked or past slots and shrinks/deselects selected slots on tap', async () => {
    const screen = await renderWithProviders(<RoomTimeline schedule={schedule} now={TEST_NOW} onBook={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('slot-10:00'));
    await fireEvent.press(screen.getByTestId('slot-08:00'));
    expect(screen.queryByTestId('book-selected')).toBeNull();

    await fireEvent.press(screen.getByTestId('slot-09:30'));
    expect(screen.getByTestId('selection-summary').props.children.join('')).toBe('09:30–10:00');

    // Tapping the same single slot deselects it.
    await fireEvent.press(screen.getByTestId('slot-09:30'));
    expect(screen.queryByTestId('book-selected')).toBeNull();
  });
});

describe('RoomDetailScreen', () => {
  afterEach(teardownTestEnvironment);

  it('loads room metadata and timeline, supports day navigation, and recovers from network errors', async () => {
    const adapter = setupTestEnvironment();
    adapter.controls.setFailureMode('network');
    const onBook = jest.fn();

    const screen = await renderWithProviders(<RoomDetailScreen roomId="room-nova" onBook={onBook} now={TEST_NOW} />);
    expect((await screen.findAllByTestId('error-state')).length).toBeGreaterThan(0);

    adapter.controls.setFailureMode('none');
    const retries = screen.getAllByTestId('retry-button');
    for (const button of retries) {
      await fireEvent.press(button);
    }

    expect(await screen.findByText('Nova')).toBeTruthy();
    expect(await screen.findByTestId('room-timeline')).toBeTruthy();
    expect(screen.getAllByText('Design sync').length).toBeGreaterThan(0);

    // Move to the next day and select an available slot.
    await fireEvent.press(screen.getByTestId('timeline-next'));
    await waitFor(() => {
      expect(screen.getAllByText('Quarterly review').length).toBeGreaterThan(0);
    });

    await fireEvent.press(screen.getByTestId('slot-11:00'));
    await fireEvent.press(screen.getByTestId('book-selected'));
    expect(onBook).toHaveBeenCalledWith({
      roomId: 'room-nova',
      date: '2026-11-22',
      startTime: '11:00',
      endTime: '11:30',
    });
  });
});
