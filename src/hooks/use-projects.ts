import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Project, PaginatedResult, Upload } from '@/types/database';

interface ProjectFilters {
  search?: string;
  companyId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}

export function useProjects(filters: ProjectFilters = {}) {
  const { search, companyId, status, page = 1, pageSize = 20 } = filters;

  return useQuery({
    queryKey: ['projects', { search, companyId, status, page, pageSize }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_search_projects', {
        p_search_term: search ?? '',
        p_company_id: companyId ?? null,
        p_status: status ?? null,
        p_page: page,
        p_page_size: pageSize,
      });

      if (error) throw error;
      return data as unknown as PaginatedResult<Project>;
    },
  });
}

export function useProject(id: number | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id) throw new Error('Project ID is required');
      const { data, error } = await supabase.rpc('fn_get_project', {
        p_project_id: id,
      });

      if (error) throw error;
      return data as unknown as Project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      company_id: number;
      address?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip_code?: number;
      property_type?: string;
      property_size?: string;
      cost_per_kilowatt_hour?: string;
      sales_tax?: string;
      interest_rate?: string;
      labor_cost?: string;
      operation_days_per_year?: number;
      loan_period?: number;
      deposit_amount?: number;
      areas?: Record<string, unknown>[];
      be_financing?: string;
      image?: string;
    }) => {
      const { data, error } = await supabase.rpc('fn_create_project', {
        p_title: params.title,
        p_company_id: params.company_id,
        p_address: params.address ?? null,
        p_address2: params.address2 ?? null,
        p_city: params.city ?? null,
        p_state: params.state ?? null,
        p_zip_code: params.zip_code ?? null,
        p_property_type: params.property_type ?? null,
        p_property_size: params.property_size ?? null,
        p_cost_per_kilowatt_hour: params.cost_per_kilowatt_hour ?? null,
        p_sales_tax: params.sales_tax ?? null,
        p_interest_rate: params.interest_rate ?? null,
        p_labor_cost: params.labor_cost ?? null,
        p_operation_days_per_year: params.operation_days_per_year ?? null,
        p_loan_period: params.loan_period ?? null,
        p_deposit_amount: params.deposit_amount ?? null,
        p_areas: params.areas ?? null,
        p_be_financing: params.be_financing ?? null,
        p_image: params.image ?? null,
      });

      if (error) throw error;
      return data as unknown as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: number; fields: Record<string, unknown> }) => {
      const { data, error } = await supabase.rpc('fn_update_project', {
        p_project_id: params.projectId,
        p_fields: params.fields as never,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });
}

export function useChangeProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: number; newStatus: string }) => {
      const { data, error } = await supabase.rpc('fn_change_project_status', {
        p_project_id: params.projectId,
        p_new_status: params.newStatus,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast.success('Project status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to change status: ${error.message}`);
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: number) => {
      const { data, error } = await supabase.rpc('fn_archive_project', {
        p_project_id: projectId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Project archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive project: ${error.message}`);
    },
  });
}

export function useProjectFiles(projectId: number | undefined) {
  return useQuery({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const { data, error } = await supabase.rpc('fn_get_project_files', {
        p_project_id: projectId,
      });

      if (error) throw error;
      return data as unknown as Upload[];
    },
    enabled: !!projectId,
  });
}
