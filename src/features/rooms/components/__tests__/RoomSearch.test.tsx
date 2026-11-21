import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { RoomList, resolveListImplementation, type ListBenchmarkSample } from '@/features/rooms/components/RoomList';
import { RoomSearchScreen } from '@/features/rooms/components/RoomSearchScreen';
import { roomSchema } from '@/features/rooms/types/room';
import { setApiAdapter } from '@/shared/api';
import { seedEquipment, seedRooms } from '@/shared/storage/seedData';
import {
  createTestQueryClient,
  renderWithProviders,
  setupTestEnvironment,
  teardownTestEnvironment,
} from '@/test/utils';

describe('RoomSearchScreen', () => {
  afterEach(teardownTestEnvironment);

  it('shows a loading state and then renders rooms with name, capacity, floor, equipment, and status', async () => {
    const adapter = setupTestEnvironment();
    let releaseRooms!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseRooms = resolve;
    });
    const listRooms = adapter.listRooms.bind(adapter);
    setApiAdapter({
      ...adapter,
      listRooms: async (query) => {
        await gate;
        return listRooms(query);
      },
    });
    const onOpenRoom = jest.fn();

    const screen = await renderWithProviders(<RoomSearchScreen onOpenRoom={onOpenRoom} />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();

    await act(async () => {
      releaseRooms();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('Orion')).toBeTruthy();
      expect(screen.getByTestId('equipment-eq-display')).toBeTruthy();
    });
    expect(screen.getByText('12 seats · Floor 3')).toBeTruthy();
    expect(screen.getByText('In use')).toBeTruthy();
    expect(screen.getAllByText('Upcoming booking').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Available').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByTestId('room-card-room-orion'));
    expect(onOpenRoom).toHaveBeenCalledWith('room-orion');
  });

  it('filters by minimum capacity and required equipment, returning all and only matching rooms', async () => {
    setupTestEnvironment();
    const screen = await renderWithProviders(<RoomSearchScreen onOpenRoom={jest.fn()} />);
    expect(await screen.findByText('Orion')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('capacity-12'));
    await waitFor(() => {
      expect(screen.getByText('Orion')).toBeTruthy();
      expect(screen.getByText('Lyra')).toBeTruthy();
      expect(screen.queryByText('Nova')).toBeNull();
      expect(screen.queryByText('Vega')).toBeNull();
    });

    await fireEvent.press(screen.getByTestId('equipment-eq-projector'));
    await waitFor(() => {
      expect(screen.getByText('Lyra')).toBeTruthy();
      expect(screen.queryByText('Orion')).toBeNull();
    });
  });

  it('filters by time range and shows inline validation when end time is not after start time', async () => {
    setupTestEnvironment();
    const screen = await renderWithProviders(<RoomSearchScreen onOpenRoom={jest.fn()} />);
    expect(await screen.findByText('Orion')).toBeTruthy();

    // Orion (08:40-09:40) and Nova (09:10-09:40) overlap 09:00-09:30; Atlas (09:40-10:40) is free.
    await fireEvent.changeText(screen.getByTestId('filter-start'), '09:00');
    await fireEvent.changeText(screen.getByTestId('filter-end'), '09:30');
    await waitFor(() => {
      expect(screen.getByText('Atlas')).toBeTruthy();
      expect(screen.queryByText('Orion')).toBeNull();
      expect(screen.queryByText('Nova')).toBeNull();
    });

    // Invalid time range displays an error without crashing.
    await fireEvent.changeText(screen.getByTestId('filter-end'), '08:30');
    expect(await screen.findByTestId('filter-range-error')).toBeTruthy();
  });

  it('shows an empty state when no room matches and lets the user clear filters', async () => {
    setupTestEnvironment();
    const screen = await renderWithProviders(<RoomSearchScreen onOpenRoom={jest.fn()} />);
    expect(await screen.findByText('Orion')).toBeTruthy();

    // Lyra is booked tomorrow 14:00-16:00 and is the only room with projector + video.
    await fireEvent.changeText(screen.getByTestId('filter-date'), '2026-11-22');
    await fireEvent.changeText(screen.getByTestId('filter-start'), '14:30');
    await fireEvent.changeText(screen.getByTestId('filter-end'), '15:30');
    await fireEvent.press(screen.getByTestId('equipment-eq-projector'));
    await fireEvent.press(screen.getByTestId('equipment-eq-video'));

    expect(await screen.findByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('No rooms match your filters')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('empty-action'));
    expect(await screen.findByText('Orion')).toBeTruthy();
  });

  it('shows a retryable network error state and recovers on Retry', async () => {
    const adapter = setupTestEnvironment();
    adapter.controls.setFailureMode('network');

    const screen = await renderWithProviders(<RoomSearchScreen onOpenRoom={jest.fn()} />);
    expect(await screen.findByTestId('error-state')).toBeTruthy();
    expect(screen.getByText("Couldn't load rooms")).toBeTruthy();

    adapter.controls.setFailureMode('none');
    await fireEvent.press(screen.getByTestId('retry-button'));
    expect(await screen.findByText('Orion')).toBeTruthy();
  });

  it('shows a stale banner when a refresh fails after data was already loaded', async () => {
    const adapter = setupTestEnvironment();
    const queryClient = createTestQueryClient();
    const screen = await renderWithProviders(<RoomSearchScreen onOpenRoom={jest.fn()} />, queryClient);
    expect(await screen.findByText('Orion')).toBeTruthy();

    adapter.controls.setFailureMode('network');
    await act(async () => {
      await queryClient.refetchQueries();
    });

    expect(await screen.findByTestId('stale-banner')).toBeTruthy();
    expect(screen.getByText('Orion')).toBeTruthy();

    adapter.controls.setFailureMode('none');
    await fireEvent.press(screen.getByTestId('stale-retry-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('stale-banner')).toBeNull();
    });
  });
});

describe('RoomList compatibility and domain validation', () => {
  it('enforces room domain constraints from data-model.md', () => {
    expect(roomSchema.safeParse(seedRooms[0]).success).toBe(true);
    expect(roomSchema.safeParse({ ...seedRooms[0], capacity: 0 }).success).toBe(false);
    expect(roomSchema.safeParse({ ...seedRooms[0], name: '   ' }).success).toBe(false);
    expect(roomSchema.safeParse({ ...seedRooms[0], floor: '' }).success).toBe(false);
    expect(roomSchema.safeParse({ ...seedRooms[0], equipment: ['eq-display', 'eq-display'] }).success).toBe(false);
  });

  it('prefers FlashList when available and falls back to FlatList otherwise', () => {
    expect(resolveListImplementation()).toBe('flash');
    expect(resolveListImplementation(undefined)).toBe('flat');
    expect(resolveListImplementation(null)).toBe('flat');
  });

  it('renders with both FlashList and FlatList fallback and records telemetry-free local timing', async () => {
    const samples: ListBenchmarkSample[] = [];
    const catalog = Array.from({ length: 40 }, (_, idx) => ({
      ...seedRooms[idx % seedRooms.length],
      id: `room-bench-${idx}`,
      name: `Room ${idx}`,
    }));

    const flashScreen = await renderWithProviders(
      <RoomList
        rooms={catalog}
        equipment={seedEquipment}
        onSelectRoom={jest.fn()}
        implementation="flash"
        onBenchmarkSample={(sample) => samples.push(sample)}
      />,
    );
    await fireEvent(flashScreen.getByTestId('room-list'), 'layout', {
      nativeEvent: { layout: { width: 400, height: 800, x: 0, y: 0 } },
    });
    expect(flashScreen.getByTestId('room-list').props.accessibilityHint).toContain('FlashList');

    const flatScreen = await renderWithProviders(
      <RoomList
        rooms={catalog}
        equipment={seedEquipment}
        onSelectRoom={jest.fn()}
        implementation="flat"
        onBenchmarkSample={(sample) => samples.push(sample)}
      />,
    );
    await fireEvent(flatScreen.getByTestId('room-list'), 'layout', {
      nativeEvent: { layout: { width: 400, height: 800, x: 0, y: 0 } },
    });
    expect(flatScreen.getByTestId('room-list').props.accessibilityHint).toContain('FlatList');

    expect(samples).toHaveLength(2);
    expect(samples[0]).toMatchObject({ implementation: 'flash', itemCount: 40 });
    expect(samples[1]).toMatchObject({ implementation: 'flat', itemCount: 40 });
    expect(samples[0].elapsedMs).toBeGreaterThanOrEqual(0);
    expect(samples[1].elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
