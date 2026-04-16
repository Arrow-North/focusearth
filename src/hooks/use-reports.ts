import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { ReportWithDetails } from '@/types/database';

export function useReport(id: number | undefined) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      if (!id) throw new Error('Report ID is required');
      const { data, error } = await supabase.rpc('fn_get_report', {
        p_report_id: id,
      });

      if (error) throw error;
      return data as unknown as ReportWithDetails;
    },
    enabled: !!id,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      projectId: number;
      proposal: Record<string, unknown>;
      proposalName: string;
      status: string;
      notes?: string;
      installation?: Record<string, unknown>;
      customPricing?: Record<string, unknown>;
      availability?: string;
      etadays?: string;
      rebates?: string;
      shipping?: string;
      tax?: string;
      sensors?: string;
      colorTunable?: string;
      lightCountWaiver?: string;
    }) => {
      const { data, error } = await supabase.rpc('fn_create_report', {
        p_project_id: params.projectId,
        p_proposal: params.proposal as never,
        p_proposal_name: params.proposalName,
        p_status: params.status,
        p_notes: params.notes ?? null,
        p_installation: params.installation ? (params.installation as never) : null,
        p_custom_pricing: params.customPricing ? (params.customPricing as never) : null,
        p_availability: params.availability ?? null,
        p_etadays: params.etadays ?? null,
        p_rebates: params.rebates ?? null,
        p_shipping: params.shipping ?? null,
        p_tax: params.tax ?? null,
        p_sensors: params.sensors ?? null,
        p_color_tunable: params.colorTunable ?? null,
        p_light_count_waiver: params.lightCountWaiver ?? null,
      });

      if (error) throw error;
      return data as unknown as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Report created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create report: ${error.message}`);
    },
  });
}

export function useCalculateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: number) => {
      const { data, error } = await supabase.rpc('fn_calculate_report', {
        p_report_id: reportId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, reportId) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      toast.success('Report calculated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate report: ${error.message}`);
    },
  });
}

export function useApproveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: number) => {
      const { data, error } = await supabase.rpc('fn_approve_report', {
        p_report_id: reportId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, reportId) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      toast.success('Report approved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve report: ${error.message}`);
    },
  });
}
