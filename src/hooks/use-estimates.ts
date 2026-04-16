import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  EstimateSU,
  EstimateREU,
  EstimateTableType,
  EstimateStage,
  OrderPath,
  PaginatedResult,
} from '@/types/database';

// --- Filters ---

interface EstimateFilters {
  tableType?: EstimateTableType;
  companyId?: number;
  isOrder?: boolean;
  archived?: boolean;
  page?: number;
  pageSize?: number;
}

// --- Queries ---

export function useEstimates(filters: EstimateFilters = {}) {
  const {
    tableType,
    companyId,
    isOrder,
    archived,
    page = 1,
    pageSize = 20,
  } = filters;

  return useQuery({
    queryKey: ['estimates', { tableType, companyId, isOrder, archived, page, pageSize }],
    queryFn: async () => {
      const filterObj: Record<string, unknown> = {};
      if (tableType) filterObj.table_type = tableType;
      if (companyId) filterObj.company_id = companyId;
      if (isOrder !== undefined) filterObj.is_order = isOrder;
      if (archived !== undefined) filterObj.archived = archived;

      const { data, error } = await supabase.rpc('fn_get_estimates', {
        p_filters: filterObj as never,
        p_page: page,
        p_page_size: pageSize,
      });

      if (error) throw error;
      return data as unknown as PaginatedResult<EstimateSU | EstimateREU>;
    },
  });
}

export function useEstimate(id: number | undefined, tableType: EstimateTableType) {
  const tableName = tableType === 'estimate_reu' ? 'estimate_reu' : 'estimate';

  return useQuery({
    queryKey: ['estimate', id, tableType],
    queryFn: async () => {
      if (!id) throw new Error('Estimate ID is required');
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as EstimateSU | EstimateREU;
    },
    enabled: !!id,
  });
}

export function useOrderPath(id: number | undefined, tableType: EstimateTableType) {
  return useQuery({
    queryKey: ['order-path', id, tableType],
    queryFn: async () => {
      if (!id) throw new Error('Estimate ID is required');
      const { data, error } = await supabase.rpc('fn_get_order_path', {
        p_estimate_id: id,
        p_table_type: tableType,
      });

      if (error) throw error;
      return data as unknown as OrderPath;
    },
    enabled: !!id,
  });
}

// --- Mutations ---

export function useCreateEstimateSU() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      reportId: number;
      companyId: number;
      reference?: string;
      salesTax?: string;
      rebates?: string;
      shipping?: string;
      depositAmount?: string;
      depositDue?: string;
      remainderDue?: string;
      remainderAmount?: string;
      suNotes?: string;
      luminaires?: Record<string, unknown>[];
    }) => {
      const { data, error } = await supabase.rpc('fn_create_estimate_su', {
        p_report_id: params.reportId,
        p_company_id: params.companyId,
        p_reference: params.reference ?? null,
        p_sales_tax: params.salesTax ?? null,
        p_rebates: params.rebates ?? null,
        p_shipping: params.shipping ?? null,
        p_deposit_amount: params.depositAmount ?? null,
        p_deposit_due: params.depositDue ?? null,
        p_remainder_due: params.remainderDue ?? null,
        p_remainder_amount: params.remainderAmount ?? null,
        p_su_notes: params.suNotes ?? null,
        p_luminaires: params.luminaires ? JSON.stringify(params.luminaires) : null,
      });

      if (error) throw error;
      return data as unknown as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Supplier estimate created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create estimate: ${error.message}`);
    },
  });
}

export function useCreateEstimateREU() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      reportId: number;
      companyId: number;
      reference?: string;
      salesTax?: string;
      rebates?: string;
      shipping?: string;
      depositAmount?: string;
      depositDue?: string;
      remainderDue?: string;
      remainderAmount?: string;
      reuNotes?: string;
      luminaires?: Record<string, unknown>[];
    }) => {
      const { data, error } = await supabase.rpc('fn_create_estimate_reu', {
        p_report_id: params.reportId,
        p_company_id: params.companyId,
        p_reference: params.reference ?? null,
        p_sales_tax: params.salesTax ?? null,
        p_rebates: params.rebates ?? null,
        p_shipping: params.shipping ?? null,
        p_deposit_amount: params.depositAmount ?? null,
        p_deposit_due: params.depositDue ?? null,
        p_remainder_due: params.remainderDue ?? null,
        p_remainder_amount: params.remainderAmount ?? null,
        p_reu_notes: params.reuNotes ?? null,
        p_luminaires: params.luminaires ? JSON.stringify(params.luminaires) : null,
      });

      if (error) throw error;
      return data as unknown as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Real estate estimate created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create estimate: ${error.message}`);
    },
  });
}

export function useApproveEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      estimateId: number;
      tableType: EstimateTableType;
      signatureText: string;
    }) => {
      const { data, error } = await supabase.rpc('fn_approve_estimate', {
        p_estimate_id: params.estimateId,
        p_table_type: params.tableType,
        p_signature_text: params.signatureText,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({
        queryKey: ['estimate', variables.estimateId, variables.tableType],
      });
      queryClient.invalidateQueries({
        queryKey: ['order-path', variables.estimateId, variables.tableType],
      });
      toast.success('Estimate approved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve estimate: ${error.message}`);
    },
  });
}

export function useAdminApproveEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      estimateId: number;
      tableType: EstimateTableType;
      adminSignatureText: string;
    }) => {
      const { data, error } = await supabase.rpc('fn_admin_approve_estimate', {
        p_estimate_id: params.estimateId,
        p_table_type: params.tableType,
        p_admin_signature_text: params.adminSignatureText,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({
        queryKey: ['estimate', variables.estimateId, variables.tableType],
      });
      queryClient.invalidateQueries({
        queryKey: ['order-path', variables.estimateId, variables.tableType],
      });
      toast.success('Admin approval complete');
    },
    onError: (error: Error) => {
      toast.error(`Failed to admin approve: ${error.message}`);
    },
  });
}

export function useConvertToOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { estimateId: number; tableType: EstimateTableType }) => {
      const { data, error } = await supabase.rpc('fn_convert_to_order', {
        p_estimate_id: params.estimateId,
        p_table_type: params.tableType,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({
        queryKey: ['estimate', variables.estimateId, variables.tableType],
      });
      queryClient.invalidateQueries({
        queryKey: ['order-path', variables.estimateId, variables.tableType],
      });
      toast.success('Converted to order');
    },
    onError: (error: Error) => {
      toast.error(`Failed to convert to order: ${error.message}`);
    },
  });
}

export function useUpdateShipping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      estimateId: number;
      tableType: EstimateTableType;
      shippingDetails: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('fn_update_shipping', {
        p_estimate_id: params.estimateId,
        p_table_type: params.tableType,
        p_shipping_details: params.shippingDetails as never,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['estimate', variables.estimateId, variables.tableType],
      });
      queryClient.invalidateQueries({
        queryKey: ['order-path', variables.estimateId, variables.tableType],
      });
      toast.success('Shipping updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update shipping: ${error.message}`);
    },
  });
}

export function useMarkInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { estimateId: number; tableType: EstimateTableType }) => {
      const { data, error } = await supabase.rpc('fn_mark_invoice', {
        p_estimate_id: params.estimateId,
        p_table_type: params.tableType,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['estimate', variables.estimateId, variables.tableType],
      });
      queryClient.invalidateQueries({
        queryKey: ['order-path', variables.estimateId, variables.tableType],
      });
      toast.success('Marked as invoiced');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark invoice: ${error.message}`);
    },
  });
}

export function useMarkReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { estimateId: number; tableType: EstimateTableType }) => {
      const { data, error } = await supabase.rpc('fn_mark_receipt', {
        p_estimate_id: params.estimateId,
        p_table_type: params.tableType,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['estimate', variables.estimateId, variables.tableType],
      });
      queryClient.invalidateQueries({
        queryKey: ['order-path', variables.estimateId, variables.tableType],
      });
      toast.success('Marked as received');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark receipt: ${error.message}`);
    },
  });
}

export function useMarkFulfilled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { estimateId: number; tableType: EstimateTableType }) => {
      const { data, error } = await supabase.rpc('fn_mark_fulfilled', {
        p_estimate_id: params.estimateId,
        p_table_type: params.tableType,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['estimate', variables.estimateId, variables.tableType],
      });
      queryClient.invalidateQueries({
        queryKey: ['order-path', variables.estimateId, variables.tableType],
      });
      toast.success('Marked as fulfilled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark fulfilled: ${error.message}`);
    },
  });
}

export function useArchiveEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { estimateId: number; tableType: EstimateTableType }) => {
      const { data, error } = await supabase.rpc('fn_archive_estimate', {
        p_estimate_id: params.estimateId,
        p_table_type: params.tableType,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({
        queryKey: ['estimate', variables.estimateId, variables.tableType],
      });
      toast.success('Estimate archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive estimate: ${error.message}`);
    },
  });
}
