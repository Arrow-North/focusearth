import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Product, PaginatedResult, ProductDetails } from '@/types/database';

export function useCategoryCounts() {
  return useQuery({
    queryKey: ['products', 'category-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product')
        .select('airtable_colum_name');

      if (error) throw error;

      const counts: Record<string, number> = {};
      let total = 0;
      for (const row of data ?? []) {
        const cat = row.airtable_colum_name;
        counts[cat] = (counts[cat] ?? 0) + 1;
        total++;
      }
      counts['all-products'] = total;
      return counts;
    },
  });
}

interface ProductFilters {
  companyId?: number;
  projectId?: number;
  reportId?: number;
  category?: string;
  search?: string;
  isExisting?: boolean;
  page?: number;
  pageSize?: number;
}

export function useProducts(filters: ProductFilters = {}) {
  const { companyId, projectId, reportId, category, search, isExisting, page = 1, pageSize = 20 } = filters;

  return useQuery({
    queryKey: ['products', { companyId, projectId, reportId, category, search, isExisting, page, pageSize }],
    queryFn: async () => {
      if (search) {
        const categoryParam = category === 'all-products' ? null : (category ?? null);
        const { data, error } = await supabase.rpc('fn_search_products', {
          p_search_term: search,
          p_category: categoryParam,
          p_page: page,
          p_page_size: pageSize,
          ...(isExisting !== undefined && { p_is_existing: isExisting }),
        });

        if (error) throw error;
        return data as unknown as PaginatedResult<Product>;
      }

      const filterObj: Record<string, unknown> = {};
      if (companyId) filterObj.company_id = companyId;
      if (projectId) filterObj.project_id = projectId;
      if (reportId) filterObj.report_id = reportId;
      if (category && category !== 'all-products') filterObj.category = category;
      if (isExisting !== undefined) filterObj.is_existing = isExisting;

      const { data, error } = await supabase.rpc('fn_list_products', {
        p_filters: filterObj as never,
        p_page: page,
        p_page_size: pageSize,
      });

      if (error) throw error;
      return data as unknown as PaginatedResult<Product>;
    },
  });
}

export function useProduct(id: number | undefined) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.rpc('fn_get_product', {
        p_product_id: id,
      });

      if (error) throw error;
      return data as unknown as Product | null;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      companyId?: number;
      projectId?: number;
      reportId?: number;
      airtableRecord: string;
      airtableBase?: string;
      airtableColumName: string;
      estimateSuId?: number;
      details?: ProductDetails;
      isExisting?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('fn_create_product', {
        p_user_id: params.userId,
        p_company_id: params.companyId ?? null,
        p_project_id: params.projectId ?? null,
        p_report_id: params.reportId ?? null,
        p_airtable_record: params.airtableRecord,
        p_airtable_base: params.airtableBase ?? null,
        p_airtable_colum_name: params.airtableColumName,
        p_estimate_su_id: params.estimateSuId ?? null,
        p_details: (params.details ?? {}) as never,
        p_is_existing: params.isExisting ?? false,
      });

      if (error) throw error;
      return data as unknown as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { productId: number; fields: Record<string, unknown> }) => {
      const { data, error } = await supabase.rpc('fn_update_product', {
        p_product_id: params.productId,
        p_fields: params.fields as never,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.productId] });
      toast.success('Product updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: number) => {
      const { data, error } = await supabase.rpc('fn_delete_product', {
        p_product_id: productId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });
}
