import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useSupabase } from './useSupabase';
import type { UserProfile } from '@/types/auth';

export function useProfile(userId?: string) {
  const { user } = useAuth();
  const supabase = useSupabase();
  const id = userId ?? user?.id;

  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.rpc('fn_get_user', { p_user_id: id });
      if (error) throw error;
      return data as unknown as UserProfile;
    },
    enabled: !!id,
  });
}
