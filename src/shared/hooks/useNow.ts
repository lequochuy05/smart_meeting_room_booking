import { useEffect, useState } from 'react';

import { now as clockNow } from '@/shared/utils/clock';

/** Returns the current instant and re-renders on an interval so time windows stay accurate. */
export function useNow(intervalMs = 30_000): Date {
  const [current, setCurrent] = useState<Date>(() => clockNow());
  useEffect(() => {
    const id = setInterval(() => setCurrent(clockNow()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return current;
}
