import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Activity, PaginatedResult } from '@/types/database';

export interface ActivityFilters {
  page?: number;
  pageSize?: number;
  userId?: string;
  projectId?: number;
}

export function useActivities(filters: ActivityFilters = {}) {
  const { page = 1, pageSize = 20, userId, projectId } = filters;

  return useQuery({
    queryKey: ['activities', filters],
    queryFn: async () => {
      const pFilters: Record<string, unknown> = {};
      if (userId) pFilters.user_id = userId;
      if (projectId != null) pFilters.project_id = projectId;

      const { data, error } = await supabase.rpc('fn_list_activities', {
        p_filters: pFilters,
        p_page: page,
        p_page_size: pageSize,
      });

      if (error) throw error;
      return data as unknown as PaginatedResult<Activity>;
    },
  });
}
