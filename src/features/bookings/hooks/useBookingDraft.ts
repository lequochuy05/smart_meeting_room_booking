import { create } from 'zustand';

import type { BookingFormValues } from '@/features/bookings/services/bookingSchema';
import type { Participant } from '@/features/bookings/types/participant';

export interface BookingDraft {
  values: BookingFormValues;
  participants: Participant[];
}

interface BookingDraftState {
  drafts: Record<string, BookingDraft>;
  saveDraft: (roomId: string, draft: BookingDraft) => void;
  clearDraft: (roomId: string) => void;
}

/** Keeps entered fields across validation errors, network failures and navigation. */
export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  drafts: {},
  saveDraft: (roomId, draft) => set((state) => ({ drafts: { ...state.drafts, [roomId]: draft } })),
  clearDraft: (roomId) =>
    set((state) => {
      const { [roomId]: _removed, ...rest } = state.drafts;
      return { drafts: rest };
    }),
}));

export function useBookingDraft(roomId: string) {
  const draft = useBookingDraftStore((state) => state.drafts[roomId]);
  const saveDraft = useBookingDraftStore((state) => state.saveDraft);
  const clearDraft = useBookingDraftStore((state) => state.clearDraft);
  return {
    draft,
    saveDraft: (next: BookingDraft) => saveDraft(roomId, next),
    clearDraft: () => clearDraft(roomId),
  };
}
