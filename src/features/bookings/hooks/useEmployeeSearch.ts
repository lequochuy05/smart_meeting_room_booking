import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { searchParticipants } from '@/features/bookings/services/participantService';
import { queryKeys } from '@/shared/api/queryClient';

export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useEmployeeSearch(query: string) {
  const debounced = useDebouncedValue(query.trim());
  return useQuery({
    queryKey: queryKeys.employees.search(debounced),
    queryFn: () => searchParticipants(debounced),
    staleTime: 5 * 60_000,
  });
}
