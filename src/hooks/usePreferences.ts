import { useQuery } from '@tanstack/react-query';
import { getPreferences } from '@/lib/db';

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: getPreferences,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
} 