import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  useProject,
  useChangeProjectStatus,
  useToggleProjectHidden,
} from '@/hooks/use-projects';
import { useProjectImageUpload } from '@/hooks/use-project-image-upload';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/use-reports';
import type { Report } from '@/types/database';
import {
  Star,
  Plus,
  Pencil,
  RefreshCw,
  UserPlus,
  Lightbulb,
  Camera,
  Loader2,
  GripVertical,
  CloudDownload,
  Eye,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

const PRIORITY_LABELS = ['Price', 'Time', 'Cost', 'Security', 'Human Centric', 'Other'];

const PRIORITY_COLORS: Record<string, string> = {
  Price:          '#EC4899',
  Time:           '#F97316',
  Cost:           '#84CC16',
  Security:       '#06B6D4',
  'Human Centric':'#A855F7',
  Other:          '#6366F1',
};

const STATUS_OPTIONS = [
  'Open',
  'Light Count',
  'Proposal Review',
  'Approved',
  'Shipped',
  'Fulfilled',
  'Archived',
  'Hidden',
];

const STATUS_MAP: Record<string, string> = {
  'Open': 'new',
  'Light Count': 'light_count',
  'Proposal Review': 'proposal',
  'Approved': 'approved',
  'Shipped': 'shipped',
  'Fulfilled': 'fulfilled',
  'Archived': 'archived',
  'Hidden': 'hidden',
};

const STATUS_REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [v, k])
);

const PROPOSAL_TABS = [
  {
    key: 'overview',
    label: 'Overview',
    columns: ['Rank', 'Report', 'System Price', 'Cost/Year', 'Added CRI', 'Added Lumens', 'ETA (days)', 'Download'],
  },
  {
    key: 'price',
    label: 'Price',
    columns: ['Rank', 'Report', 'Total Price', 'Price Above Lowest', 'LED Price', 'Installation Price', 'Taxes, Shipping,Etc.'],
  },
  {
    key: 'cost',
    label: 'Cost',
    columns: ['Rank', 'Report', 'Cost/Year', 'Cost Above Lowest/Year', 'Cost Above Lowest(5 Yr)', 'Payback(Yrs)'],
  },
  {
    key: 'security',
    label: 'Security',
    columns: ['Rank', 'Report', 'Added Lumens', 'Lumen Increase/Sq.Ft.', 'Lumen Increase/Fixture(%)', 'Integrated Sensors(%)'],
  },
  {
    key: 'time',
    label: 'Time',
    columns: ['Rank', 'Report', 'ETA (Days)', 'ETA Beyond Shortest (Days)', 'Stocked?'],
  },
  {
    key: 'human_centric',
    label: 'Human Centric',
    columns: ['Rank', 'Report', 'Improvement/Fixture (CRI)', 'Improvement/Fixture(%)', 'Sensors(%)', 'Color Tunable(%)'],
  },
];

const USER_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  Reu: { label: 'Real Estate', color: 'bg-purple-500' },
  Su: { label: 'Sales', color: 'bg-green-500' },
  Eu: { label: 'Electrician', color: 'bg-blue-500' },
  Au: { label: 'Admin', color: 'bg-orange-500' },
  Sa: { label: 'Super Admin', color: 'bg-red-500' },
  SUPERADMIN: { label: 'Super Admin', color: 'bg-red-500' },
  Gu: { label: 'Guest', color: 'bg-gray-400' },
};

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: { color } } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded shadow px-3 py-1.5 flex items-center gap-2 text-sm whitespace-nowrap">
      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      <span className="text-gray-700">{name}: <strong>{value}%</strong></span>
    </div>
  );
}

// ── Report table helpers ──────────────────────────────────────────────────────

/** Strip trailing .00; keep other decimals rounded to 2 places. */
function fmt(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toFixed(2).replace(/\.00$/, '');
}

/** Dollar-formatted: $1,234.56 → removes .00 → $1,234 */
function fmtPrice(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  const str = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + str.replace(/\.00$/, '');
}

/** Difference formatted as a price: $1,234 */
function diffFmtPrice(v: string | null | undefined, min: number): string {
  const n = parseFloat(v ?? '');
  if (isNaN(n)) return '—';
  const diff = n - min;
  const str = diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + str.replace(/\.00$/, '');
}

/** Difference for non-price values (days, etc.) */
function diffFmt(v: string | null | undefined, min: number): string {
  const n = parseFloat(v ?? '');
  if (isNaN(n)) return '—';
  return (n - min).toFixed(2).replace(/\.00$/, '');
}

interface ReportMins { price: number; costYear: number; eta: number }

function getTabCells(tabKey: string, report: Report, rank: number, mins: ReportMins): React.ReactNode[] {
  switch (tabKey) {
    case 'overview':
      return [rank, report.proposal_name, fmtPrice(report.system_price), fmtPrice(report.cost_year), fmt(report.added_cri), fmt(report.added_lumens), fmt(report.etadays), <CloudDownload key="dl" className="h-4 w-4 text-gray-500 mx-auto" />];
    case 'price': {
      const taxShipping = (Number(report.tax ?? 0) + Number(report.shipping ?? 0));
      return [rank, report.proposal_name, fmtPrice(report.system_price), diffFmtPrice(report.system_price, mins.price), fmtPrice(report.led_price), '—', taxShipping ? fmtPrice(String(taxShipping)) : '—'];
    }
    case 'cost': {
      const cy = parseFloat(report.cost_year ?? '');
      const aboveYear = isNaN(cy) ? '—' : '$' + (cy - mins.costYear).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\.00$/, '');
      const above5yr  = isNaN(cy) ? '—' : '$' + ((cy - mins.costYear) * 5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\.00$/, '');
      return [rank, report.proposal_name, fmtPrice(report.cost_year), aboveYear, above5yr, fmt(report.payback)];
    }
    case 'security':
      return [rank, report.proposal_name, fmt(report.added_lumens), fmt(report.lumen_increase_sq_ft), fmt(report.lumen_increase_fixture), fmt(report.sensors)];
    case 'time':
      return [rank, report.proposal_name, fmt(report.etadays), diffFmt(report.etadays, mins.eta), report.availability ? 'Yes' : 'No'];
    case 'human_centric':
      return [rank, report.proposal_name, fmt(report.added_cri), '—', fmt(report.sensors), fmt(report.color_tunable)];
    default:
      return [];
  }
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, userType } = useAuth();
  const isReu = userType === 'Reu';
  const projectId = id ? Number(id) : undefined;

  const { data: project, isLoading } = useProject(projectId);
  const statusMutation = useChangeProjectStatus();
  const hideMutation = useToggleProjectHidden();
  const { upload: uploadImage, isUploading } = useProjectImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: reportsData } = useReports(projectId);
  const reports = reportsData ?? [];

  const reportMins: ReportMins = {
    price:    Math.min(...reports.map(r => parseFloat(r.system_price ?? '')).filter(n => !isNaN(n)), 0),
    costYear: Math.min(...reports.map(r => parseFloat(r.cost_year   ?? '')).filter(n => !isNaN(n)), 0),
    eta:      Math.min(...reports.map(r => parseFloat(r.etadays     ?? '')).filter(n => !isNaN(n)), 0),
  };

  // Fetch users for the invite dialog
  const { data: usersData } = useUsers({ pageSize: 100 });
  const users = usersData?.rows ?? [];

  // Group users by type for invite dropdown
  const usersByType = users.reduce<Record<string, typeof users>>((acc, user) => {
    const type = user.type ?? 'Gu';
    if (!acc[type]) acc[type] = [];
    acc[type].push(user);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <DashboardLayout title="Project">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout title="Project Not Found">
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Project not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusLabel = STATUS_REVERSE_MAP[project.status ?? 'new'] ?? 'Open';
  const addressLine = project.address ?? '';
  const titleLine = project.title ?? 'Untitled Project';
  const displayTitle = addressLine ? `${addressLine} | ${titleLine}` : titleLine;

  const handleStatusUpdate = () => {
    if (!selectedStatus) return;
    const dbStatus = STATUS_MAP[selectedStatus];
    if (dbStatus) {
      statusMutation.mutate(
        { projectId: project.id, newStatus: dbStatus },
        { onSuccess: () => setStatusDialogOpen(false) },
      );
    }
  };

  const handleInviteUser = () => {
    if (!selectedUserId) return;
    // TODO: Wire to actual invite RPC
    setInviteDialogOpen(false);
    setSelectedUserId('');
  };

  const handleProjectImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    e.target.value = '';
    await uploadImage(file, projectId);
  };

  const notesText =
    project.notes && typeof project.notes === 'object'
      ? JSON.stringify(project.notes)
      : typeof project.notes === 'string'
        ? project.notes
        : '';

  return (
    <DashboardLayout 
      title={<span><Link to="/projects" className="hover:underline">Projects</Link><span className="mx-2">/</span><span>{titleLine}</span></span>}
      mainClassName='!p-0'>
      {/* ── Header Section ─────────────────────────────────────────── */}
      <div className="bg-white border border-[#dbdada] shadow-sm overflow-hidden mb-0">
        <div className="flex gap-6 p-8 bg-[#f5f5f5] items-start">
          {/* Thumbnail */}
          <div
            className="shrink-0 overflow-hidden bg-gray-100 border border-[#dbdada] relative group cursor-pointer"
            style={{ width: '220px', height: '146px', borderRadius: '5px' }}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : project.image ? (
              <img
                src={project.image}
                alt={titleLine}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Lightbulb className="h-12 w-12 text-gray-300" strokeWidth={1} />
              </div>
            )}
            {/* Hover overlay */}
            {!isUploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                <Camera className="h-5 w-5 text-white" />
                <span className="text-white text-xs font-medium">Upload Photo</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleProjectImageChange}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 shrink-0" />
              <h2 className="text-2xl font-bold text-gray-900 truncate">
                {displayTitle}
              </h2>
            </div>
            <p className="text-[1.125rem] text-gray-700">
              <span className="font-semibold">Energy Consultants:</span>{' '}
              <span className="font-normal text-gray-600">—</span>
            </p>
            <p className="text-[1.125rem] text-gray-700">
              <span className="font-semibold">Colleagues:</span>{' '}
              <span className="font-normal text-gray-600">—</span>
            </p>
            <p className="text-[1.125rem] text-gray-700">
              <span className="font-semibold">Status:</span>{' '}
              <span className="font-normal text-gray-600">{statusLabel}</span>
            </p>
            <p className="text-[1.125rem] text-gray-700">
              <span className="font-semibold">Notes:</span>{' '}
              <span className="font-normal text-gray-600">{notesText || '—'}</span>
            </p>
          </div>

          {/* Pie Chart — REU only */}
          {isReu && (() => {
            const pp = (project.property_priorities ?? {}) as Record<string, number>;
            const slices = PRIORITY_LABELS
              .filter((l) => (pp[l] ?? 0) > 0)
              .map((l) => ({ name: l, value: pp[l], color: PRIORITY_COLORS[l] }));
            const total = slices.reduce((s, x) => s + x.value, 0);
            const remainder = 100 - total;
            const pieData = slices.length === 0
              ? [{ name: 'Unallocated', value: 100, color: '#d1d5db' }]
              : remainder > 0
                ? [...slices, { name: 'Unallocated', value: remainder, color: '#d1d5db' }]
                : slices;
            return (
              <div className="shrink-0 self-center">
                <PieChart width={140} height={140}>
                  <Pie data={pieData} cx={65} cy={65} outerRadius={62} innerRadius={0} dataKey="value" strokeWidth={1}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </div>
            );
          })()}

          {/* Divider */}
          <div className="self-stretch w-px bg-gray-300 mx-1 -my-8" />

          {/* Action Buttons */}
          {isReu ? (
            /* REU — 3 buttons stacked vertically */
            <div className="shrink-0 flex flex-col" style={{ gap: '1.25rem' }}>
              <Button
                className="text-gray-900 hover:opacity-90 justify-center px-3"
                style={{ backgroundColor: '#feab7c', fontSize: '0.75rem', fontWeight: 600, width: '135px', borderRadius: '5px' }}
                onClick={() => navigate(`/projects/${project.id}/edit`)}
              >
                <Pencil className="h-4 w-4 shrink-0" />
                Edit Details
              </Button>
              <Button
                className="text-white hover:opacity-90 justify-center px-3"
                style={{ backgroundColor: '#2c628d', fontSize: '0.75rem', fontWeight: 600, width: '135px', borderRadius: '5px' }}
                onClick={() => setInviteDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                Add Colleague
              </Button>
              <Button
                className="text-white hover:opacity-90 justify-center px-3"
                style={{ backgroundColor: '#6d8da7', fontSize: '0.75rem', fontWeight: 600, width: '135px', borderRadius: '5px' }}
                disabled={hideMutation.isPending}
                onClick={() => projectId && hideMutation.mutate(projectId)}
              >
                <Eye className="h-4 w-4 shrink-0" />
                {project?.hidden ? 'Show Project' : 'Hide Project'}
              </Button>
            </div>
          ) : (
            /* Admin / Super Admin — 2×2 grid */
            <div className="shrink-0 inline-grid grid-cols-2" style={{ gap: '1.25rem' }}>
              <Button
                className="text-gray-900 hover:opacity-90 justify-center px-3"
                style={{ backgroundColor: '#8FCF74', fontSize: '0.75rem', fontWeight: 600, width: '135px', maxWidth: '135px', borderRadius: '5px' }}
                onClick={() => navigate(`/projects/${project.id}/reports/create`)}
              >
                <Plus className="h-4 w-4 shrink-0" />
                New Report
              </Button>
              <Button
                className="text-gray-900 hover:opacity-90 justify-center px-3"
                style={{ backgroundColor: '#feab7c', fontSize: '0.75rem', fontWeight: 600, width: '135px', maxWidth: '135px', borderRadius: '5px' }}
                onClick={() => navigate(`/projects/${project.id}/edit`)}
              >
                <Pencil className="h-4 w-4 shrink-0" />
                Edit Details
              </Button>
              <Button
                className="text-gray-900 hover:opacity-90 justify-center px-3"
                style={{ backgroundColor: '#ffe68d', fontSize: '0.75rem', fontWeight: 600, width: '135px', maxWidth: '135px', borderRadius: '5px' }}
                onClick={() => {
                  setSelectedStatus(statusLabel);
                  setStatusDialogOpen(true);
                }}
              >
                <RefreshCw className="h-4 w-4 shrink-0" />
                Change Status
              </Button>
              <Button
                className="text-white hover:opacity-90 justify-center px-3"
                style={{ backgroundColor: '#2c628d', fontSize: '0.75rem', fontWeight: 600, width: '135px', maxWidth: '135px', borderRadius: '5px' }}
                onClick={() => setInviteDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                Add User
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Proposal Tabs ──────────────────────────────────────────── */}
      <div className="bg-[#f9fafb] overflow-hidden" style={{ paddingTop: '1.25rem' }}>
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 bg-[#f9fafb]">
          {PROPOSAL_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 py-3 text-center transition-colors text-[#619c48] text-[18px] font-bold ${
                activeTab === tab.key
                  ? 'border-b-4 border-[#619c48]'
                  : 'opacity-70 hover:opacity-100'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {PROPOSAL_TABS.map((tab) => {
          if (tab.key !== activeTab) return null;
          return (
            <div key={tab.key} className="bg-[#f5f5f5] border border-[#E2E8F0] p-6">
              <div className="overflow-x-auto">
                <div className="min-w-max px-0.5 py-1">
                {/* Header row */}
                <div className="flex mb-5">
                  {tab.columns.map((col) => (
                    <div
                      key={col}
                      className="flex-1 min-w-[110px] py-1 px-4 text-center font-bold text-gray-800 text-sm whitespace-nowrap"
                    >
                      {col}
                    </div>
                  ))}
                </div>

                {/* Data rows */}
                <div className="flex flex-col gap-4">
                  {reports.map((report, i) => {
                    const cells = getTabCells(tab.key, report, i + 1, reportMins);
                    return (
                      <div
                        key={report.id}
                        className="flex bg-white rounded-[0.625rem] shadow-md cursor-pointer hover:bg-[#ffd6c9] transition-colors"
                        onClick={() => navigate(`/projects/${projectId}/proposal/${report.id}`)}
                      >
                        {cells.map((cell, ci) => (
                          <div
                            key={ci}
                            className="flex-1 min-w-[110px] py-4 px-4 text-center text-gray-700 text-sm flex items-center justify-center"
                          >
                            {ci === 0 ? (
                              <GripVertical className="h-5 w-5 text-gray-400" />
                            ) : cell}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                </div>{/* end min-w-max padding wrapper */}
              </div>{/* end overflow-x-auto */}

              {reports.length === 0 && (
                <div className="mt-4 border-2 border-green-400 rounded-lg p-6">
                  <p className="text-sm text-gray-700">
                    Looks like you don&apos;t have any proposals yet... Click the orange Edit Details button to add more property information or{' '}
                    <button
                      className="underline text-gray-900 font-medium"
                      onClick={() => navigate('/messages')}
                    >
                      click here
                    </button>{' '}
                    to contact your Energy Consultant.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Change Status Dialog ───────────────────────────────────── */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[853px] p-0 overflow-hidden">
          <div className="px-6" style={{ backgroundColor: '#ffe68d', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
            <DialogHeader>
              <DialogTitle className="text-center text-gray-900" style={{ fontSize: '24px', fontWeight: 700 }}>
                Change Project Status
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="space-y-8" style={{ padding: '3rem 7rem' }}>
            <p className="text-gray-600 text-center" style={{ fontSize: '24px' }}>
              Select the status that best reflects the current project
            </p>
            <div style={{ maxWidth: '481px', marginLeft: 'auto', marginRight: 'auto' }}>
              <Input
                value={project.title ?? ''}
                disabled
                className="bg-gray-200 text-gray-600"
              />
            </div>
            <div style={{ maxWidth: '481px', marginLeft: 'auto', marginRight: 'auto' }}>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center">
              <Button
                className="text-white hover:opacity-90 px-10"
                style={{ backgroundColor: '#2c628d', fontSize: '18px', fontWeight: 600, width: '254px', height: '51px' }}
                onClick={handleStatusUpdate}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Invite User Dialog ─────────────────────────────────────── */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-[853px] p-0 overflow-hidden">
          <div className="px-6" style={{ backgroundColor: '#8FCF74', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
            <DialogHeader>
              <DialogTitle className="text-center text-gray-900" style={{ fontSize: '24px', fontWeight: 700 }}>
                Invite User to Project
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="space-y-8" style={{ padding: '3rem 7rem' }}>
            <p className="text-gray-600 text-center" style={{ fontSize: '24px' }}>
              Invite a user to participate on this project:
            </p>
            <div style={{ maxWidth: '481px', marginLeft: 'auto', marginRight: 'auto' }}>
              <Input
                value={project.title ?? ''}
                disabled
                className="bg-gray-100 text-gray-600"
              />
            </div>
            <div style={{ maxWidth: '481px', marginLeft: 'auto', marginRight: 'auto' }}>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(usersByType).map(([type, typeUsers]) => {
                    const typeInfo = USER_TYPE_LABELS[type] ?? { label: type, color: 'bg-gray-400' };
                    return (
                      <div key={type}>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-500">
                          <span className={`w-2 h-2 rounded-full ${typeInfo.color}`} />
                          {typeInfo.label}
                        </div>
                        {typeUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center">
              <Button
                className="text-white hover:opacity-90 px-10"
                style={{ backgroundColor: '#2c628d', fontSize: '18px', fontWeight: 600, width: '254px', height: '51px' }}
                onClick={handleInviteUser}
              >
                Invite
              </Button>
            </div>
            <p className="text-center text-gray-500" style={{ fontSize: '18px' }}>
              Don&apos;t see them?{' '}
              <button
                className="text-purple-500 font-medium hover:underline"
                onClick={() => {
                  setInviteDialogOpen(false);
                  navigate('/users');
                }}
              >
                Invite new user
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
