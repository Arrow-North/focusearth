import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/use-debounce';
import {
  Plus,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Lightbulb,
  ExternalLink,
  GripVertical,
  Star,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
];

export default function Projects() {
  const navigate = useNavigate();
  const { isAdmin, userType, companyId } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');
  const pageSize = 9;

  const canCreate = isAdmin || userType === 'Reu' || userType === 'Su';

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useProjects({
    search: debouncedSearch || undefined,
    companyId: !isAdmin ? (companyId ?? undefined) : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    pageSize,
  });

  const projects = data?.rows ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 4;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
          >
            {viewMode === 'dashboard' ? 'Dashboard View' : 'List View'}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewMode('dashboard')}>
            Dashboard View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setViewMode('list')}>
            List View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        className="bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
        onClick={() => setFilterOpen(true)}
      >
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        Filter
      </Button>

      {canCreate && (
        <Button
          className="bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
          onClick={() => navigate('/projects/create')}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      )}
    </div>
  );

  return (
    <DashboardLayout title="Projects" actions={headerActions}>
      {/* Filter Dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Projects</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setPage(1);
                }}
              >
                Clear
              </Button>
              <Button onClick={() => setFilterOpen(false)}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project Grid / List */}
      {isLoading ? (
        viewMode === 'dashboard' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        )
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No projects found</p>
          <p className="text-sm mt-1">
            {search ? 'Try adjusting your search or filters.' : 'Create your first project to get started.'}
          </p>
        </div>
      ) : viewMode === 'dashboard' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-4">
          {projects.map((project) => {
            const status = project.status ?? 'new';
            const hasProposal = status === 'proposal' || status === 'approved' || status === 'in_progress';
            const statusLabel = hasProposal ? 'Proposal Review' : 'Light Count';
            const statusIcon = hasProposal ? (
              <Lightbulb className="h-4 w-4" />
            ) : (
              <Lightbulb className="h-4 w-4" />
            );
            const statusColors = hasProposal
              ? 'text-green-800'
              : 'text-yellow-800';

            const addressParts = [
              project.address,
              [project.city, project.state].filter(Boolean).join(', '),
              project.zip_code,
            ].filter(Boolean).join(', ');

            return (
              <div
                key={project.id}
                className="flex items-center bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <GripVertical className="h-5 w-5 text-gray-400 shrink-0 mr-3" />
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 shrink-0 mr-3" />

                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-semibold text-sm text-gray-900 truncate">
                    {project.title ?? 'Untitled Project'}
                  </span>
                  {addressParts && (
                    <>
                      <span className="text-gray-400">·</span>
                      <span className="text-sm text-gray-500 truncate">
                        {addressParts}
                      </span>
                    </>
                  )}
                </div>

                <div className={`flex items-center gap-1.5 text-xs font-medium ${statusColors} shrink-0 mx-4`}>
                  {statusIcon}
                  <span>{statusLabel}</span>
                </div>

                <button
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
                    hasProposal
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${project.id}`);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  {hasProposal ? 'View Proposal' : 'Property Info'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10 mb-4">
          <button
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>

          {getPageNumbers().map((p) => (
            <button
              key={p}
              className={`w-9 h-9 rounded text-sm font-medium transition-colors ${
                p === page
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}

          <button
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
