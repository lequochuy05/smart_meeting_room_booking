import { z } from 'zod';

import { participantSchema, type Participant } from '@/features/bookings/types/participant';
import { getApiAdapter } from '@/shared/api';

/** Searches the employee directory. Participants must come from this directory. */
export async function searchParticipants(query: string): Promise<Participant[]> {
  return z.array(participantSchema).parse(await getApiAdapter().searchEmployees(query.trim()));
}
