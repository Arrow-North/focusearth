import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Company, CompanyUpdateLog } from '@/types/database';

// ─── Filters ────────────────────────────────────────────────────────────────

export interface CompanyFilters {
  search?: string;
  type?: string | null;
  page?: number;
  pageSize?: number;
}

// ─── useCompanies ───────────────────────────────────────────────────────────

export function useCompanies(filters: CompanyFilters = {}) {
  const { page = 1, pageSize = 20 } = filters;

  return useQuery({
    queryKey: ['companies', filters],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('company')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false)
        .order('name')
        .range(from, to);

      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        rows: data as Company[],
        total_count: count ?? 0,
        page,
        page_size: pageSize,
      };
    },
  });
}

// ─── useCompany ─────────────────────────────────────────────────────────────

export function useCompany(id: number | string | undefined) {
  const numericId = id ? Number(id) : undefined;

  return useQuery({
    queryKey: ['companies', numericId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company')
        .select('*')
        .eq('id', numericId!)
        .single();

      if (error) throw error;
      return data as Company;
    },
    enabled: numericId != null && !isNaN(numericId),
  });
}

// ─── useCreateCompany ───────────────────────────────────────────────────────

export function useCreateCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      type: string;
      company_sub_type?: string;
      address: string;
      address2?: string;
      city: string;
      state: string;
      zip_code: string;
      country: string;
      website?: string;
      notes?: string;
      property_priorities?: Array<{ name: string; percentage: number; color?: string }>;
      service_areas?: Array<{ state?: string; city?: string }>;
    }) => {
      const { data, error } = await supabase.rpc('fn_create_company', {
        p_name: params.name,
        p_type: params.type,
        p_company_sub_type: params.company_sub_type ?? null,
        p_address: params.address,
        p_address2: params.address2 ?? null,
        p_city: params.city,
        p_state: params.state,
        p_zip_code: params.zip_code,
        p_country: params.country,
        p_website: params.website ?? '',
        p_notes: params.notes ?? null,
        p_property_priorities: params.property_priorities ?? [],
        p_service_areas: params.service_areas ?? [],
      });

      if (error) throw error;
      // fn_create_company returns the new company ID as an INTEGER
      return data as number;
    },
    onSuccess: () => {
      toast.success('Company created successfully');
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create company');
    },
  });
}

// ─── useUpdateCompany ───────────────────────────────────────────────────────

export function useUpdateCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      fields,
    }: {
      companyId: number;
      fields: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('fn_update_company', {
        p_company_id: companyId,
        p_fields: fields,
      });
      if (error) throw error;
      return data as unknown as Company;
    },
    onSuccess: (_data, variables) => {
      toast.success('Company updated');
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['companies', variables.companyId] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update company');
    },
  });
}

// ─── useDeleteCompany ───────────────────────────────────────────────────────

export function useDeleteCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: number) => {
      const { error } = await supabase.rpc('fn_delete_company', {
        p_company_id: companyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Company deleted');
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete company');
    },
  });
}

// ─── useCompanyChanges ──────────────────────────────────────────────────────

export function useCompanyChanges(companyId: number | undefined) {
  return useQuery({
    queryKey: ['companies', companyId, 'changes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_company_changes', {
        p_company_id: companyId!,
      });
      if (error) throw error;
      return data as unknown as CompanyUpdateLog[];
    },
    enabled: companyId != null,
  });
}

// ─── useInviteToCompany ─────────────────────────────────────────────────────

export function useInviteToCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      email,
      userType,
    }: {
      companyId: number;
      email: string;
      userType: string;
    }) => {
      const { error } = await supabase.rpc('fn_invite_user_to_company', {
        p_company_id: companyId,
        p_email: email,
        p_user_type: userType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitation sent');
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to send invitation');
    },
  });
}

// ─── useAcceptInvite ────────────────────────────────────────────────────────

export function useAcceptInvite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: number) => {
      const { error } = await supabase.rpc('fn_accept_company_invite', {
        p_company_id: companyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitation accepted');
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to accept invitation');
    },
  });
}

// ─── useApproveCompany ──────────────────────────────────────────────────────

export function useApproveCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: number) => {
      const { error } = await supabase.rpc('fn_admin_approve_company', {
        p_company_id: companyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Company approved');
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to approve company');
    },
  });
}

// ─── useRemoveFromCompany ───────────────────────────────────────────────────

export function useRemoveFromCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      userId,
    }: {
      companyId: number;
      userId: string;
    }) => {
      const { error } = await supabase.rpc('fn_remove_user_from_company', {
        p_company_id: companyId,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User removed from company');
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to remove user');
    },
  });
}
