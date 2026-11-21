import { useQuery } from '@tanstack/react-query';

import {
  fetchEquipment,
  fetchRoom,
  fetchRoomSchedule,
  fetchRooms,
  filtersToQuery,
} from '@/features/rooms/services/roomService';
import type { RoomFilters } from '@/features/rooms/types/room';
import { queryKeys } from '@/shared/api/queryClient';

export function useRooms(filters: RoomFilters) {
  return useQuery({
    queryKey: queryKeys.rooms.list(filtersToQuery(filters)),
    queryFn: () => fetchRooms(filters),
  });
}

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: queryKeys.rooms.detail(roomId),
    queryFn: () => fetchRoom(roomId),
  });
}

export function useRoomSchedule(roomId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.rooms.schedule(roomId, date),
    queryFn: () => fetchRoomSchedule(roomId, date),
  });
}

export function useEquipment() {
  return useQuery({
    queryKey: queryKeys.equipment,
    queryFn: fetchEquipment,
    staleTime: 10 * 60_000,
  });
}
