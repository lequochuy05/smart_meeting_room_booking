import { create } from 'zustand';

import type { DaySlot } from '@/features/bookings/services/bookingRules';

export interface SlotSelection {
  roomId: string;
  date: string;
  /** Inclusive slot indexes of a contiguous range. */
  start: number;
  end: number;
}

/**
 * Pure selection logic: tap an available slot to select it, tap an adjacent
 * available slot to extend, tap the edge of a range to shrink it.
 */
export function nextSelection(
  current: SlotSelection | null,
  roomId: string,
  date: string,
  index: number,
  slots: readonly DaySlot[],
): SlotSelection | null {
  const slot = slots[index];
  if (!slot || slot.state !== 'AVAILABLE') return current;
  const fresh = { roomId, date, start: index, end: index };
  if (!current || current.roomId !== roomId || current.date !== date) return fresh;

  if (index >= current.start && index <= current.end) {
    if (current.start === current.end) return null;
    if (index === current.end) return { ...current, end: current.end - 1 };
    if (index === current.start) return { ...current, start: current.start + 1 };
    return fresh;
  }
  if (index === current.end + 1) return { ...current, end: index };
  if (index === current.start - 1) return { ...current, start: index };
  return fresh;
}

interface SlotSelectionState {
  selection: SlotSelection | null;
  select: (roomId: string, date: string, index: number, slots: readonly DaySlot[]) => void;
  clear: () => void;
}

export const useSlotSelection = create<SlotSelectionState>((set) => ({
  selection: null,
  select: (roomId, date, index, slots) =>
    set((state) => ({ selection: nextSelection(state.selection, roomId, date, index, slots) })),
  clear: () => set({ selection: null }),
}));
