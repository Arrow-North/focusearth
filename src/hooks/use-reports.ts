import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Report, ReportWithDetails } from '@/types/database';
import { calculateReport, type ProposalItem } from '@/lib/report-calculator';

export function useReports(projectId: number | undefined) {
  return useQuery({
    queryKey: ['reports', { projectId }],
    queryFn: async () => {
      if (!projectId) return [] as Report[];
      const { data, error } = await supabase.rpc('fn_list_reports', {
        p_project_id: projectId,
      });
      if (error) throw error;
      return (data as unknown as Report[]) ?? [];
    },
    enabled: !!projectId,
  });
}

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
    refetchOnWindowFocus: false,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      projectId: number;
      proposal: unknown;
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

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      reportId: number;
      proposalName?: string;
      proposal?: unknown;
      status?: string;
      notes?: string;
    }) => {
      const fields: Record<string, unknown> = {};
      if (params.proposalName !== undefined) fields.proposal_name = params.proposalName;
      if (params.proposal     !== undefined) fields.proposal      = params.proposal;
      if (params.status       !== undefined) fields.status        = params.status;
      if (params.notes        !== undefined) fields.notes         = params.notes;

      const { error } = await supabase
        .from('report')
        .update(fields as never)
        .eq('id', params.reportId);

      if (error) throw error;
      return params.reportId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report', variables.reportId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update report: ${error.message}`);
    },
  });
}

export function useCalculateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: number) => {
      // 1. Fetch the report (proposal + meta)
      const { data: reportRaw, error: reportErr } = await supabase.rpc('fn_get_report', {
        p_report_id: reportId,
      });
      if (reportErr) throw reportErr;
      const { report } = reportRaw as unknown as ReportWithDetails;

      // 2. Fetch the project config fields needed for calculation
      const { data: project, error: projectErr } = await supabase
        .from('project')
        .select('cost_per_kilowatt_hour, operation_days_per_year, labor_cost, sales_tax, light_count, state')
        .eq('id', report.project_id as number)
        .single();
      if (projectErr) throw projectErr;

      // 3. Run the pure TypeScript calculation
      const proposalItems = Array.isArray(report.proposal)
        ? (report.proposal as unknown as ProposalItem[])
        : [];

      const result = calculateReport(
        project,
        proposalItems,
        {
          installation:  report.installation as { total?: string } | null,
          customPricing: report.custom_pricing as Record<string, boolean> | null,
          shipping:      parseFloat(report.shipping  ?? '0') || 0,
          rebates:       parseFloat(report.rebates   ?? '0') || 0,
        },
      );

      if (!result) {
        throw new Error('Custom pricing detected — calculation skipped.');
      }

      // 4. Persist the computed values
      const { error: saveErr } = await supabase.rpc('fn_save_report_calculation', {
        p_report_id:   reportId,
        p_calculation: result as never,
      });
      if (saveErr) throw saveErr;

      return result;
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
