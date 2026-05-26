import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  PaginatedResult,
  UserWithCompany,
  UserType,
} from '@/types/database';

// ─── Filters ────────────────────────────────────────────────────────────────

export interface UserFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  userType?: UserType | null;
  companyId?: number | null;
  enabled?: boolean;
}

// ─── useUsers ───────────────────────────────────────────────────────────────

export function useUsers(filters: UserFilters = {}) {
  const { page = 1, pageSize = 20, search, userType, companyId, enabled } = filters;

  const hasSearch = !!search && search.length > 0;

  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      // Use search RPC when there's a search term or type filter
      if (hasSearch || userType) {
        const { data, error } = await supabase.rpc('fn_search_users', {
          p_search_term: search ?? '',
          p_user_type: userType ?? null,
          p_page: page,
          p_page_size: pageSize,
        });
        if (error) throw error;
        return data as unknown as PaginatedResult<UserWithCompany>;
      }

      // Otherwise use the list RPC
      const pFilters: Record<string, unknown> = {};
      if (companyId != null) pFilters.company_id = companyId;
      if (enabled != null) pFilters.enabled = enabled;

      const { data, error } = await supabase.rpc('fn_list_users', {
        p_page: page,
        p_page_size: pageSize,
        p_filters: pFilters,
      });

      if (error) throw error;
      return data as unknown as PaginatedResult<UserWithCompany>;
    },
  });
}

// ─── useUser ────────────────────────────────────────────────────────────────

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_user', {
        p_user_id: id!,
      });
      if (error) throw error;
      return data as unknown as UserWithCompany;
    },
    enabled: !!id,
  });
}

// ─── useSearchUsers ─────────────────────────────────────────────────────────

export function useSearchUsers(
  search: string,
  userType?: UserType | null,
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: ['users', 'search', search, userType, page, pageSize],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_search_users', {
        p_search_term: search,
        p_user_type: userType ?? null,
        p_page: page,
        p_page_size: pageSize,
      });
      if (error) throw error;
      return data as unknown as PaginatedResult<UserWithCompany>;
    },
    enabled: search.length > 0,
  });
}

// ─── useUpdateUser ──────────────────────────────────────────────────────────

export function useUpdateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      fields,
    }: {
      userId: string;
      fields: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('fn_update_user', {
        p_user_id: userId,
        p_fields: fields,
      });
      if (error) throw error;
      return data as unknown as UserWithCompany;
    },
    onSuccess: (_data, variables) => {
      toast.success('User updated successfully');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', variables.userId] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update user');
    },
  });
}

// ─── useContactRecipients ───────────────────────────────────────────────────
// Fetches users eligible to receive contact messages: SUPERADMIN and Au types.

export function useContactRecipients() {
  return useQuery({
    queryKey: ['users', 'contact-recipients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, type')
        .in('type', ['SUPERADMIN', 'Au'])
        .eq('is_deleted', false)
        .order('first_name', { ascending: true });
      if (error) throw error;
      return data as { id: string; first_name: string | null; last_name: string; email: string; type: string }[];
    },
  });
}

// ─── useDeleteUser ──────────────────────────────────────────────────────────

export function useDeleteUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('fn_delete_user', {
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete user');
    },
  });
}
