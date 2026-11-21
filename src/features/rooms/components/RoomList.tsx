import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useMemo, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { RoomStatusBadge } from '@/features/rooms/components/RoomStatusBadge';
import type { Equipment, Room } from '@/features/rooms/types/room';
import { colors, radius, spacing } from '@/shared/components/theme';

export type ListImplementation = 'flash' | 'flat';

/** Local-only render timing sample (never transmitted as telemetry). */
export interface ListBenchmarkSample {
  implementation: ListImplementation;
  itemCount: number;
  elapsedMs: number;
}

/**
 * FlashList is the preferred implementation. If the module failed to load or
 * does not expose the component on this runtime, rooms render with FlatList.
 */
export function resolveListImplementation(...args: [flashList?: unknown]): ListImplementation {
  const candidate = args.length > 0 ? args[0] : FlashList;
  return typeof candidate === 'function' || (typeof candidate === 'object' && candidate !== null) ? 'flash' : 'flat';
}

interface RoomCardProps {
  room: Room;
  equipmentSummary: string;
  onPress: (roomId: string) => void;
}

const RoomCard = memo(function RoomCard({ room, equipmentSummary, onPress }: RoomCardProps) {
  return (
    <Pressable
      testID={`room-card-${room.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${room.name}, ${room.capacity} seats, ${room.floor}`}
      onPress={() => onPress(room.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Text style={styles.name}>{room.name}</Text>
        <RoomStatusBadge status={room.status} />
      </View>
      <Text style={styles.meta}>
        {room.capacity} seats · {room.floor}
      </Text>
      <Text style={styles.equipment}>{equipmentSummary}</Text>
    </Pressable>
  );
});

interface RoomListProps {
  rooms: Room[];
  equipment: Equipment[];
  onSelectRoom: (roomId: string) => void;
  implementation?: ListImplementation;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Optional local-only callback for telemetry-free render benchmarks. */
  onBenchmarkSample?: (sample: ListBenchmarkSample) => void;
}

export function RoomList({
  rooms,
  equipment,
  onSelectRoom,
  implementation = resolveListImplementation(),
  refreshing,
  onRefresh,
  onBenchmarkSample,
}: RoomListProps) {
  const startedAtRef = useRef<number>(Date.now());
  const reportedRef = useRef(false);

  const equipmentById = useMemo(() => new Map(equipment.map((item) => [item.id, item.name])), [equipment]);
  const renderItem = useCallback(
    ({ item }: { item: Room }) => {
      const summary =
        item.equipment.length > 0
          ? item.equipment.map((id) => equipmentById.get(id) ?? id).join(' · ')
          : 'No equipment';
      return <RoomCard room={item} equipmentSummary={summary} onPress={onSelectRoom} />;
    },
    [equipmentById, onSelectRoom],
  );
  const keyExtractor = useCallback((room: Room) => room.id, []);

  const reportLocalTiming = useCallback(() => {
    if (!onBenchmarkSample || reportedRef.current) return;
    reportedRef.current = true;
    onBenchmarkSample({
      implementation,
      itemCount: rooms.length,
      elapsedMs: Math.max(0, Date.now() - startedAtRef.current),
    });
  }, [implementation, onBenchmarkSample, rooms.length]);

  const common = {
    data: rooms,
    renderItem,
    keyExtractor,
    contentContainerStyle: styles.content,
    refreshing,
    onRefresh,
    onLayout: reportLocalTiming,
    testID: 'room-list',
    accessibilityHint: `Rendered with ${implementation === 'flash' ? 'FlashList' : 'FlatList'}`,
  };

  return implementation === 'flash' ? (
    <FlashList {...common} drawDistance={250} />
  ) : (
    <FlatList {...common} removeClippedSubviews initialNumToRender={10} windowSize={5} />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 14 },
  equipment: { color: colors.text, fontSize: 13 },
});
