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
} from '@/hooks/use-projects';
import { useProjectImageUpload } from '@/hooks/use-project-image-upload';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/hooks/useAuth';
import {
  Star,
  Plus,
  Pencil,
  RefreshCw,
  UserPlus,
  Lightbulb,
  Camera,
  Loader2,
} from 'lucide-react';

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
    columns: ['Rank', 'Status', 'Report', 'System Price', 'Cost/Year', 'Added CRI', 'Added Lumens', 'ETA (days)', 'Download'],
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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const projectId = id ? Number(id) : undefined;

  const { data: project, isLoading } = useProject(projectId);
  const statusMutation = useChangeProjectStatus();
  const { upload: uploadImage, isUploading } = useProjectImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

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
    <DashboardLayout title={<span><Link to="/projects" className="hover:underline">Projects</Link><span className="mx-2">/</span><span>{titleLine}</span></span>}>
      {/* ── Header Section ─────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex gap-6">
          {/* Thumbnail */}
          <div
            className="shrink-0 w-40 h-28 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative group cursor-pointer"
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {displayTitle}
              </h2>
            </div>
            <div className="space-y-0.5 text-sm text-gray-700">
              <p>
                <span className="font-bold">Energy Consultants:</span>{' '}
                {/* TODO: populate from project associations */}
                —
              </p>
              <p>
                <span className="font-bold">Associated Users:</span>{' '}
                —
              </p>
              <p>
                <span className="font-bold">Status:</span> {statusLabel}
              </p>
              {notesText && (
                <p>
                  <span className="font-bold">Notes:</span> {notesText}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 grid grid-cols-2 gap-2 self-start">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => navigate(`/projects/${project.id}/reports/create`)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Report
            </Button>
            <Button
              size="sm"
              className="bg-orange-400 hover:bg-orange-500 text-white"
              onClick={() => navigate(`/projects/${project.id}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit Details
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                setSelectedStatus(statusLabel);
                setStatusDialogOpen(true);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Change Status
            </Button>
            <Button
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-white"
              onClick={() => setInviteDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {/* ── Proposal Tabs ──────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200">
          {PROPOSAL_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
                activeTab === tab.key
                  ? 'text-gray-900 border-b-2 border-green-600'
                  : 'text-green-600 hover:text-green-700'
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
            <div key={tab.key} className="p-6">
              {/* Column headers */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {tab.columns.map((col) => (
                        <th
                          key={col}
                          className="py-3 px-3 text-center font-semibold text-gray-700 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                </table>
              </div>

              {/* Empty state */}
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
            </div>
          );
        })}
      </div>

      {/* ── Change Status Dialog ───────────────────────────────────── */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Yellow gradient header */}
          <div className="bg-gradient-to-r from-yellow-200 to-yellow-100 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-bold text-gray-900">
                Change Project Status
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Select the status that best reflects the current project
            </p>
            <Input
              value={project.title ?? ''}
              disabled
              className="bg-gray-200 text-gray-600"
            />
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
            <div className="flex justify-center">
              <Button
                className="bg-slate-700 hover:bg-slate-800 text-white px-10"
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
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Green gradient header */}
          <div className="bg-gradient-to-r from-green-300 to-green-200 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-bold text-gray-900">
                Invite User to Project
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Invite a user to participate on this project:
            </p>
            <Input
              value={project.title ?? ''}
              disabled
              className="bg-gray-100 text-gray-600"
            />
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
            <div className="flex justify-center">
              <Button
                className="bg-slate-700 hover:bg-slate-800 text-white px-10"
                onClick={handleInviteUser}
              >
                Invite
              </Button>
            </div>
            <p className="text-sm text-center text-gray-500">
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
