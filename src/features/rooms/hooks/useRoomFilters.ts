import { create } from 'zustand';

import type { RoomFilters } from '@/features/rooms/types/room';
import { now } from '@/shared/utils/clock';
import { todayInCompanyTimezone } from '@/shared/utils/dateTime';

interface RoomFiltersState {
  filters: RoomFilters;
  setDate: (date: string) => void;
  setStartTime: (time: string) => void;
  setEndTime: (time: string) => void;
  setMinimumCapacity: (capacity: number | null) => void;
  toggleEquipment: (equipmentId: string) => void;
  reset: () => void;
}

export function createDefaultFilters(): RoomFilters {
  return {
    date: todayInCompanyTimezone(now()),
    startTime: '',
    endTime: '',
    minimumCapacity: null,
    equipment: [],
  };
}

/** Local UI state only; room data itself lives in TanStack Query. */
export const useRoomFilters = create<RoomFiltersState>((set) => ({
  filters: createDefaultFilters(),
  setDate: (date) => set((s) => ({ filters: { ...s.filters, date } })),
  setStartTime: (startTime) => set((s) => ({ filters: { ...s.filters, startTime } })),
  setEndTime: (endTime) => set((s) => ({ filters: { ...s.filters, endTime } })),
  setMinimumCapacity: (minimumCapacity) => set((s) => ({ filters: { ...s.filters, minimumCapacity } })),
  toggleEquipment: (equipmentId) =>
    set((s) => ({
      filters: {
        ...s.filters,
        equipment: s.filters.equipment.includes(equipmentId)
          ? s.filters.equipment.filter((id) => id !== equipmentId)
          : [...s.filters.equipment, equipmentId],
      },
    })),
  reset: () => set({ filters: createDefaultFilters() }),
}));
