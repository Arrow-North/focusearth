import { useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useOverviewUserSummary,
  useOverviewCompanyActivity,
  useRealEstateStats,
  useSupplierStats,
  useElectricianStats,
  useSalesStats,
  useAdminStats,
} from '@/hooks/use-analytics';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AnalyticsPieWithTable } from '@/components/analytics/AnalyticsPieWithTable';
import { AnalyticsBarChart } from '@/components/analytics/AnalyticsBarChart';
import { Download } from 'lucide-react';

const USER_TYPE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  Sa: 'System Admin',
  Au: 'Admin User',
  Reu: 'Real Estate',
  Su: 'Supplier',
  Eu: 'Electrician',
  Gu: 'Guest',
};

function formatMonth(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseSqft(size: string | null): number {
  if (!size) return 0;
  const num = parseFloat(size.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function getSizeRange(size: string | null): string {
  const sqft = parseSqft(size);
  if (sqft === 0) return 'Unknown';
  if (sqft < 5000) return '< 5,000 sqft';
  if (sqft < 25000) return '5,000 - 25,000 sqft';
  if (sqft < 100000) return '25,000 - 100,000 sqft';
  return '100,000+ sqft';
}

function groupByMonth<T>(
  items: T[],
  getDate: (item: T) => string | null,
  getValue: (item: T) => number,
): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const month = formatMonth(getDate(item));
    map.set(month, (map.get(month) ?? 0) + getValue(item));
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => {
      const da = new Date(a.label);
      const db = new Date(b.label);
      return da.getTime() - db.getTime();
    });
}

function topN<T>(
  items: T[],
  getKey: (item: T) => string,
  getLabel: (item: T) => string,
  n: number,
): { name: string; value: number }[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const item of items) {
    const key = getKey(item);
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { label: getLabel(item), count: 1 });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((v) => ({ name: v.label, value: v.count }));
}

// ---- Tab Components ----

function OverviewTab() {
  const { data: userSummary, isLoading: usLoading } = useOverviewUserSummary();
  const { data: companyActivity, isLoading: caLoading } = useOverviewCompanyActivity();

  const summaryTableData = useMemo(
    () =>
      (userSummary ?? []).map((u) => ({
        name: USER_TYPE_LABELS[u.user_type] ?? u.user_type,
        value: Number(u.qty),
        qty: Number(u.qty),
        ep_usage_hours: Number(u.ep_usage_hours),
      })),
    [userSummary],
  );

  const usagePieData = useMemo(
    () =>
      (userSummary ?? []).map((u) => ({
        name: USER_TYPE_LABELS[u.user_type] ?? u.user_type,
        value: Number(u.ep_usage_hours),
      })),
    [userSummary],
  );

  const topCompanies = useMemo(
    () =>
      [...(companyActivity ?? [])]
        .sort((a, b) => Number(b.activity_count) - Number(a.activity_count))
        .slice(0, 10)
        .map((c) => ({ label: c.company_name, value: Number(c.activity_count) })),
    [companyActivity],
  );

  const companyUserData = useMemo(
    () =>
      [...(companyActivity ?? [])]
        .sort((a, b) => Number(b.user_count) - Number(a.user_count))
        .slice(0, 15)
        .map((c) => ({
          name: c.company_name,
          value: Number(c.user_count),
          company_type: c.company_type,
        })),
    [companyActivity],
  );

  return (
    <div className="space-y-6">
      {/* User Type Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Type Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {usLoading ? (
            <div className="h-24 bg-muted animate-pulse rounded" />
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">QTY</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">EP Usage Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryTableData.map((row) => (
                    <tr key={row.name} className="border-b last:border-0">
                      <td className="py-2 px-3">{row.name}</td>
                      <td className="py-2 px-3">{row.qty}</td>
                      <td className="py-2 px-3">{row.ep_usage_hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pie charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Total Users"
          data={summaryTableData}
          columns={[
            { key: 'name', label: 'Type' },
            { key: 'value', label: 'Count' },
          ]}
          isLoading={usLoading}
        />
        <AnalyticsPieWithTable
          title="Total EP Usage"
          data={usagePieData}
          columns={[
            { key: 'name', label: 'Type' },
            { key: 'value', label: 'Hours' },
          ]}
          isLoading={usLoading}
        />
      </div>

      {/* Most Active Companies */}
      <AnalyticsBarChart
        title="Most Active Companies"
        data={topCompanies}
        color="#8b5cf6"
        isLoading={caLoading}
      />

      {/* Users Per Company */}
      <AnalyticsPieWithTable
        title="Users Per Company"
        data={companyUserData}
        columns={[
          { key: 'name', label: 'Company' },
          { key: 'company_type', label: 'Type' },
          { key: 'value', label: 'Users' },
        ]}
        isLoading={caLoading}
      />
    </div>
  );
}

function RealEstateTab() {
  const { data: stats, isLoading } = useRealEstateStats();

  const sqftByType = useMemo(() => {
    const map = new Map<string, { sqft: number; count: number }>();
    const seen = new Set<number>();
    for (const r of stats ?? []) {
      if (seen.has(r.project_id)) continue;
      seen.add(r.project_id);
      const type = r.property_type || 'Unknown';
      const existing = map.get(type) ?? { sqft: 0, count: 0 };
      existing.sqft += parseSqft(r.property_size);
      existing.count++;
      map.set(type, existing);
    }
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      value: v.sqft,
      total_sqft: v.sqft.toLocaleString(),
      project_count: v.count,
    }));
  }, [stats]);

  const proposalPipeline = useMemo(
    () =>
      groupByMonth(
        (stats ?? []).filter((r) => r.estimate_reu_id && r.reu_is_order === false),
        (r) => r.reu_created_at,
        () => 1,
      ),
    [stats],
  );

  const activeProperties = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Set<number>();
    for (const r of stats ?? []) {
      if (seen.has(r.project_id)) continue;
      seen.add(r.project_id);
      const status = r.project_status || 'Unknown';
      map.set(status, (map.get(status) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const fulfilledByMonth = useMemo(
    () =>
      groupByMonth(
        (stats ?? []).filter((r) => r.reu_fulfilled === true),
        (r) => r.reu_created_at,
        () => 1,
      ),
    [stats],
  );

  const activeUsers = useMemo(
    () =>
      topN(
        (stats ?? []).filter((r) => r.user_id),
        (r) => r.user_id!,
        (r) => `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Unknown',
        10,
      ),
    [stats],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Property Square Footage"
          data={sqftByType}
          columns={[
            { key: 'name', label: 'Property Type' },
            { key: 'total_sqft', label: 'Total SqFt' },
            { key: 'project_count', label: 'Projects' },
          ]}
          isLoading={isLoading}
        />
        <AnalyticsBarChart
          title="Active Proposal Pipeline"
          data={proposalPipeline}
          color="#14b8a6"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Total Active Properties"
          data={activeProperties}
          columns={[
            { key: 'name', label: 'Status' },
            { key: 'value', label: 'Count' },
          ]}
          isLoading={isLoading}
        />
        <AnalyticsBarChart
          title="Fulfilled Proposals"
          data={fulfilledByMonth}
          color="#6366f1"
          isLoading={isLoading}
        />
      </div>

      <AnalyticsPieWithTable
        title="Most Active Users"
        data={activeUsers}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'value', label: 'Activity Count' },
        ]}
        isLoading={isLoading}
      />
    </div>
  );
}

function SupplierTab() {
  const { data: stats, isLoading } = useSupplierStats();

  const productsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stats ?? []) {
      const cat = s.product_category || 'Unknown';
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const fulfilledByMonth = useMemo(
    () =>
      groupByMonth(
        (stats ?? []).filter((s) => s.su_fulfilled === true),
        (s) => s.estimate_created_at,
        (s) => {
          const price = parseFloat(s.price_per_unit ?? '0');
          const qty = s.su_luminaires ?? 1;
          return isNaN(price) ? 0 : price * qty;
        },
      ),
    [stats],
  );

  const productTypes = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stats ?? []) {
      const type = s.product_type || 'Unknown';
      map.set(type, (map.get(type) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const soldByMonth = useMemo(
    () =>
      groupByMonth(
        (stats ?? []).filter((s) => s.su_is_order === true),
        (s) => s.estimate_created_at,
        () => 1,
      ),
    [stats],
  );

  const activeUsers = useMemo(
    () =>
      topN(
        (stats ?? []).filter((s) => s.user_id),
        (s) => s.user_id!,
        (s) => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
        10,
      ),
    [stats],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Total Products"
          data={productsByCategory}
          columns={[
            { key: 'name', label: 'Category' },
            { key: 'value', label: 'Count' },
          ]}
          isLoading={isLoading}
        />
        <AnalyticsBarChart
          title="Total Fulfilled Amount"
          data={fulfilledByMonth}
          color="#14b8a6"
          isLoading={isLoading}
          valueFormatter={formatCurrency}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Product Types Sold"
          data={productTypes}
          columns={[
            { key: 'name', label: 'Product Type' },
            { key: 'value', label: 'Count' },
          ]}
          isLoading={isLoading}
        />
        <AnalyticsBarChart
          title="Total Products Sold"
          data={soldByMonth}
          color="#8b5cf6"
          isLoading={isLoading}
        />
      </div>

      <AnalyticsPieWithTable
        title="Most Active Users"
        data={activeUsers}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'value', label: 'Products Count' },
        ]}
        isLoading={isLoading}
      />
    </div>
  );
}

function ElectricianTab() {
  const { data: stats, isLoading } = useElectricianStats();

  const projectsByBidStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stats ?? []) {
      if (!s.bid_status) continue;
      map.set(s.bid_status, (map.get(s.bid_status) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const awardedByUser = useMemo(() => {
    const awarded = (stats ?? []).filter((s) => s.bid_status === 'awarded' && s.bid_total);
    const map = new Map<string, { label: string; total: number }>();
    for (const s of awarded) {
      const key = s.company_name || 'Unknown';
      const existing = map.get(key) ?? { label: key, total: 0 };
      existing.total += Number(s.bid_total) || 0;
      map.set(key, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((v) => ({ label: v.label, value: v.total }));
  }, [stats]);

  const projectCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stats ?? []) {
      const title = s.project_title || 'Unknown';
      map.set(title, (map.get(title) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [stats]);

  const serviceAreaCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stats ?? []) {
      if (!Array.isArray(s.service_areas)) continue;
      for (const area of s.service_areas) {
        const state = typeof area === 'object' && area !== null && 'state' in area
          ? String((area as { state: string }).state)
          : typeof area === 'string'
            ? area
            : null;
        if (state) {
          map.set(state, (map.get(state) ?? 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([label, value]) => ({ label, value }));
  }, [stats]);

  const activeUsers = useMemo(
    () =>
      topN(
        (stats ?? []).filter((s) => s.user_id),
        (s) => s.user_id!,
        (s) => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
        10,
      ),
    [stats],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Total Projects Awarded"
          data={projectsByBidStatus}
          columns={[
            { key: 'name', label: 'Bid Status' },
            { key: 'value', label: 'Count' },
          ]}
          isLoading={isLoading}
        />
        <AnalyticsBarChart
          title="Project Amount Awarded"
          data={awardedByUser}
          color="#f59e0b"
          isLoading={isLoading}
          valueFormatter={formatCurrency}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Total Products Installed"
          data={projectCounts}
          columns={[
            { key: 'name', label: 'Project' },
            { key: 'value', label: 'Count' },
          ]}
          isLoading={isLoading}
        />
        <AnalyticsBarChart
          title="Most Serviceable Areas"
          data={serviceAreaCounts}
          color="#06b6d4"
          isLoading={isLoading}
        />
      </div>

      <AnalyticsPieWithTable
        title="Most Active Users"
        data={activeUsers}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'value', label: 'Project Count' },
        ]}
        isLoading={isLoading}
      />
    </div>
  );
}

function SalesTab() {
  const { data: stats, isLoading } = useSalesStats();

  const sqftRanges = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Set<number>();
    for (const s of stats ?? []) {
      if (seen.has(s.project_id)) continue;
      seen.add(s.project_id);
      const range = getSizeRange(s.property_size);
      map.set(range, (map.get(range) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const proposalAmountByMonth = useMemo(
    () =>
      groupByMonth(
        (stats ?? []).filter((s) => s.report_approved === true && s.system_price),
        () => null, // We don't have report created_at; group all into one bucket
        (s) => Number(s.system_price) || 0,
      ),
    [stats],
  );

  // Better: group approved reports by unique report_id to avoid double-counting
  const approvedReportAmounts = useMemo(() => {
    const seen = new Set<number>();
    const items: { system_price: number }[] = [];
    for (const s of stats ?? []) {
      if (!s.report_id || s.report_approved !== true || seen.has(s.report_id)) continue;
      seen.add(s.report_id);
      items.push({ system_price: Number(s.system_price) || 0 });
    }
    const total = items.reduce((sum, i) => sum + i.system_price, 0);
    return total > 0
      ? [{ label: 'Approved', value: total }]
      : [];
  }, [stats]);

  const activeProjects = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Set<number>();
    for (const s of stats ?? []) {
      if (seen.has(s.project_id)) continue;
      seen.add(s.project_id);
      const status = s.project_status || 'Unknown';
      map.set(status, (map.get(status) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const luminaireByMonth = useMemo(() => {
    const seen = new Set<number>();
    const items: { led_price: number }[] = [];
    for (const s of stats ?? []) {
      if (!s.estimate_su_id || s.su_is_order !== true || seen.has(s.estimate_su_id)) continue;
      seen.add(s.estimate_su_id);
      items.push({ led_price: Number(s.led_price) || 0 });
    }
    const total = items.reduce((sum, i) => sum + i.led_price, 0);
    return total > 0
      ? [{ label: 'Total', value: total }]
      : [];
  }, [stats]);

  const activeUsers = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    const seen = new Set<number>();
    for (const s of stats ?? []) {
      if (!s.user_id || seen.has(s.project_id)) continue;
      seen.add(s.project_id);
      const existing = map.get(s.user_id) ?? {
        label: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
        count: 0,
      };
      existing.count++;
      map.set(s.user_id, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((v) => ({ name: v.label, value: v.count }));
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Active Project Square Footage"
          data={sqftRanges}
          columns={[
            { key: 'name', label: 'Size Range' },
            { key: 'value', label: 'Projects' },
          ]}
          isLoading={isLoading}
        />
        <AnalyticsBarChart
          title="Proposal Amount Accepted"
          data={approvedReportAmounts.length > 0 ? approvedReportAmounts : proposalAmountByMonth}
          color="#14b8a6"
          isLoading={isLoading}
          valueFormatter={formatCurrency}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Active Projects"
          data={activeProjects}
          columns={[
            { key: 'name', label: 'Status' },
            { key: 'value', label: 'Count' },
          ]}
          isLoading={isLoading}
        />
        <AnalyticsBarChart
          title="Luminaire System Amount Sold"
          data={luminaireByMonth}
          color="#8b5cf6"
          isLoading={isLoading}
          valueFormatter={formatCurrency}
        />
      </div>

      <AnalyticsPieWithTable
        title="Most Active Users"
        data={activeUsers}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'value', label: 'Project Count' },
        ]}
        isLoading={isLoading}
      />
    </div>
  );
}

function AdminTab() {
  const { data: stats, isLoading } = useAdminStats();

  const companiesManaged = useMemo(
    () =>
      (stats ?? [])
        .filter((s) => Number(s.companies_managed) > 0)
        .map((s) => ({
          name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
          value: Number(s.companies_managed),
        })),
    [stats],
  );

  const activeOrders = useMemo(
    () =>
      (stats ?? [])
        .filter((s) => Number(s.active_orders) > 0)
        .map((s) => ({
          label: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
          value: Number(s.active_orders),
        })),
    [stats],
  );

  const productsManaged = useMemo(
    () =>
      (stats ?? [])
        .filter((s) => Number(s.products_managed) > 0)
        .map((s) => ({
          name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
          value: Number(s.products_managed),
        })),
    [stats],
  );

  const messagesSent = useMemo(
    () =>
      (stats ?? [])
        .filter((s) => Number(s.messages_sent) > 0)
        .map((s) => ({
          label: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
          value: Number(s.messages_sent),
        })),
    [stats],
  );

  const activityCount = useMemo(
    () =>
      (stats ?? [])
        .filter((s) => Number(s.activity_count) > 0)
        .map((s) => ({
          name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
          value: Number(s.activity_count),
        })),
    [stats],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Total Companies Managed"
          data={companiesManaged}
          columns={[
            { key: 'name', label: 'Admin' },
            { key: 'value', label: 'Companies' },
          ]}
          isLoading={isLoading}
        />
        <AnalyticsBarChart
          title="Total Active Orders"
          data={activeOrders}
          color="#f59e0b"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsPieWithTable
          title="Total Products Managed"
          data={productsManaged}
          columns={[
            { key: 'name', label: 'Admin' },
            { key: 'value', label: 'Products' },
          ]}
          isLoading={isLoading}
        />
        <AnalyticsBarChart
          title="Communications Outreach"
          data={messagesSent}
          color="#06b6d4"
          isLoading={isLoading}
        />
      </div>

      <AnalyticsPieWithTable
        title="Most Active Users"
        data={activityCount}
        columns={[
          { key: 'name', label: 'Admin' },
          { key: 'value', label: 'Activity Count' },
        ]}
        isLoading={isLoading}
      />
    </div>
  );
}

// ---- Main Page ----

export default function Analytics() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) {
    return (
      <DashboardLayout title="Analytics">
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Access Denied</p>
          <p className="text-sm mt-1">You need admin privileges to view analytics.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            Go to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics">
      <Tabs defaultValue="overview">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="real-estate">Real Estate</TabsTrigger>
            <TabsTrigger value="supplier">Supplier</TabsTrigger>
            <TabsTrigger value="electrician">Electrician</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="real-estate" className="space-y-6">
          <RealEstateTab />
        </TabsContent>

        <TabsContent value="supplier" className="space-y-6">
          <SupplierTab />
        </TabsContent>

        <TabsContent value="electrician" className="space-y-6">
          <ElectricianTab />
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <SalesTab />
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          <AdminTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
