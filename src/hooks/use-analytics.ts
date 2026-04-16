import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserType } from '@/types/database';
import type {
  OverviewUserSummary,
  OverviewCompanyActivity,
  RealEstateStat,
  SupplierStat,
  ElectricianStat,
  SalesStat,
  AdminStat,
} from '@/types/analytics';

interface UserCountByType {
  type: UserType;
  count: number;
}

interface ProjectCountByStatus {
  status: string;
  count: number;
}

interface PlatformUsageEntry {
  user_id: string;
  total: number;
  created_at: string;
  updated_at: string;
}

export function useUserCounts() {
  return useQuery({
    queryKey: ['analytics', 'user-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('type')
        .eq('is_deleted', false);

      if (error) throw error;

      const countMap = new Map<string, number>();
      for (const row of data ?? []) {
        const t = row.type ?? 'unknown';
        countMap.set(t, (countMap.get(t) ?? 0) + 1);
      }

      const results: UserCountByType[] = [];
      for (const [type, count] of countMap.entries()) {
        results.push({ type: type as UserType, count });
      }

      return results;
    },
  });
}

export function useProjectCounts() {
  return useQuery({
    queryKey: ['analytics', 'project-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project')
        .select('status')
        .eq('archived', false);

      if (error) throw error;

      const countMap = new Map<string, number>();
      for (const row of data ?? []) {
        const s = row.status ?? 'unknown';
        countMap.set(s, (countMap.get(s) ?? 0) + 1);
      }

      const results: ProjectCountByStatus[] = [];
      for (const [status, count] of countMap.entries()) {
        results.push({ status, count });
      }

      return {
        byStatus: results,
        total: data?.length ?? 0,
      };
    },
  });
}

export function useEstimateCounts() {
  return useQuery({
    queryKey: ['analytics', 'estimate-counts'],
    queryFn: async () => {
      const { data: suData, error: suError } = await supabase
        .from('estimate')
        .select('id, is_order, archived')
        .eq('archived', false);

      if (suError) throw suError;

      const { data: reuData, error: reuError } = await supabase
        .from('estimate_reu')
        .select('id, is_order, archived')
        .eq('archived', false);

      if (reuError) throw reuError;

      const suTotal = suData?.length ?? 0;
      const reuTotal = reuData?.length ?? 0;
      const suOrders = suData?.filter((e) => e.is_order).length ?? 0;
      const reuOrders = reuData?.filter((e) => e.is_order).length ?? 0;

      return {
        suTotal,
        reuTotal,
        total: suTotal + reuTotal,
        suOrders,
        reuOrders,
        totalOrders: suOrders + reuOrders,
        suEstimates: suTotal - suOrders,
        reuEstimates: reuTotal - reuOrders,
      };
    },
  });
}

export function usePlatformUsage() {
  return useQuery({
    queryKey: ['analytics', 'platform-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_platform_usage')
        .select('*')
        .order('total', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as PlatformUsageEntry[];
    },
  });
}

// --- Materialized View Hooks ---

export function useOverviewUserSummary() {
  return useQuery({
    queryKey: ['analytics', 'mv-overview-user-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_overview_user_summary')
        .select('*');

      if (error) throw error;
      return (data ?? []) as OverviewUserSummary[];
    },
  });
}

export function useOverviewCompanyActivity() {
  return useQuery({
    queryKey: ['analytics', 'mv-overview-company-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_overview_company_activity')
        .select('*');

      if (error) throw error;
      return (data ?? []) as OverviewCompanyActivity[];
    },
  });
}

export function useRealEstateStats() {
  return useQuery({
    queryKey: ['analytics', 'mv-real-estate-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_real_estate_stats')
        .select('*');

      if (error) throw error;
      return (data ?? []) as RealEstateStat[];
    },
  });
}

export function useSupplierStats() {
  return useQuery({
    queryKey: ['analytics', 'mv-supplier-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_supplier_stats')
        .select('*');

      if (error) throw error;
      return (data ?? []) as SupplierStat[];
    },
  });
}

export function useElectricianStats() {
  return useQuery({
    queryKey: ['analytics', 'mv-electrician-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_electrician_stats')
        .select('*');

      if (error) throw error;
      return (data ?? []) as ElectricianStat[];
    },
  });
}

export function useSalesStats() {
  return useQuery({
    queryKey: ['analytics', 'mv-sales-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_sales_stats')
        .select('*');

      if (error) throw error;
      return (data ?? []) as SalesStat[];
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['analytics', 'mv-admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_admin_stats')
        .select('*');

      if (error) throw error;
      return (data ?? []) as AdminStat[];
    },
  });
}
