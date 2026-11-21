import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { RoomFilters } from '@/features/rooms/components/RoomFilters';
import { RoomList } from '@/features/rooms/components/RoomList';
import { useRoomFilters } from '@/features/rooms/hooks/useRoomFilters';
import { useEquipment, useRooms } from '@/features/rooms/hooks/useRooms';
import { QueryStateView } from '@/shared/components/QueryStateView';
import { colors } from '@/shared/components/theme';

interface RoomSearchScreenProps {
  onOpenRoom: (roomId: string) => void;
}

export function RoomSearchScreen({ onOpenRoom }: RoomSearchScreenProps) {
  const filters = useRoomFilters((state) => state.filters);
  const reset = useRoomFilters((state) => state.reset);
  const rooms = useRooms(filters);
  const equipment = useEquipment();
  const open = useCallback((roomId: string) => onOpenRoom(roomId), [onOpenRoom]);

  return (
    <View style={styles.container}>
      <RoomFilters equipment={equipment.data ?? []} />
      <View style={styles.results}>
        <QueryStateView
          query={rooms}
          isEmpty={(data) => data.length === 0}
          empty={{
            title: 'No rooms match your filters',
            message: 'Try a different time, a smaller capacity, or fewer equipment requirements.',
            actionLabel: 'Clear filters',
            onAction: reset,
          }}
          loadingMessage="Finding rooms…"
          errorTitle="Couldn't load rooms"
        >
          {(data) => (
            <RoomList
              rooms={data}
              equipment={equipment.data ?? []}
              onSelectRoom={open}
              refreshing={rooms.isRefetching}
              onRefresh={() => void rooms.refetch()}
            />
          )}
        </QueryStateView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  results: { flex: 1 },
});
