import { z } from 'zod';

export interface Participant {
  /** Employee directory identifier. */
  id: string;
  name: string;
  email: string;
}

export const participantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().min(1),
});
