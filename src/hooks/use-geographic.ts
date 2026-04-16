import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import type { GeoState, GeoCity } from '@/types/database';

/**
 * Fetch all US states, ordered by name.
 */
export function useStates() {
  const supabase = useSupabase();

  return useQuery<GeoState[]>({
    queryKey: ['geographic', 'states'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('state')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as GeoState[];
    },
    staleTime: 1000 * 60 * 60, // states rarely change – cache for 1 hour
  });
}

/**
 * Fetch cities for a given state, ordered by name.
 * The query is disabled when no stateId is provided.
 */
export function useCities(stateId: number | null | undefined) {
  const supabase = useSupabase();

  return useQuery<GeoCity[]>({
    queryKey: ['geographic', 'cities', stateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('city')
        .select('*')
        .eq('state_id', stateId!)
        .order('name');

      if (error) throw error;
      return data as GeoCity[];
    },
    enabled: !!stateId,
    staleTime: 1000 * 60 * 30, // cache cities for 30 minutes
  });
}
