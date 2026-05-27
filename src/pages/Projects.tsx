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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  ExternalLink,
  Star,
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: 'my_projects', label: 'My Projects' },
  { value: 'priority', label: 'Priority' },
  { value: 'light_count', label: 'Light Count' },
  { value: 'proposal_review', label: 'Proposal Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'archived', label: 'Archived' },
  { value: 'hidden', label: 'Hidden' },
];

// Drag handle icon (6 dots pattern)
function DragHandle() {
  return (
    <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <ellipse cx="2.12" cy="2" rx="2.12" ry="2" fill="#5F5F5F" />
      <ellipse cx="9.36" cy="2" rx="2.12" ry="2" fill="#5F5F5F" />
      <ellipse cx="2.12" cy="9" rx="2.12" ry="2" fill="#5F5F5F" />
      <ellipse cx="9.36" cy="9" rx="2.12" ry="2" fill="#5F5F5F" />
      <ellipse cx="2.12" cy="16" rx="2.12" ry="2" fill="#5F5F5F" />
      <ellipse cx="9.36" cy="16" rx="2.12" ry="2" fill="#5F5F5F" />
    </svg>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const { isAdmin, userType, companyId } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');
  const [hiddenOpen, setHiddenOpen] = useState(true);
  const [closedOpen, setClosedOpen] = useState(true);
  const [archivedOpen, setArchivedOpen] = useState(true);
  const pageSize = 9;

  const canCreate = isAdmin || userType === 'Reu' || userType === 'Su';

  const debouncedSearch = useDebounce(search, 300);

  // Map selected filters to status query
  const getStatusFilter = () => {
    if (selectedFilters.includes('approved')) return 'approved';
    if (selectedFilters.includes('proposal_review')) return 'proposal';
    if (selectedFilters.includes('light_count')) return 'in_progress';
    if (selectedFilters.includes('fulfilled')) return 'completed';
    return undefined;
  };

  const { data, isLoading } = useProjects({
    search: debouncedSearch || undefined,
    companyId: !isAdmin ? (companyId ?? undefined) : undefined,
    status: getStatusFilter(),
    page,
    pageSize,
  });

  const projects = data?.rows ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Toggle filter selection
  const toggleFilter = (value: string) => {
    setSelectedFilters((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
    setPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 7;
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
      {/* Dashboard View Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="bg-[#E8F5E9] hover:bg-[#d4ecd6] text-gray-700 border-[#E8F5E9] hover:border-[#d4ecd6] px-5"
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

      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="bg-[#8DA4B8] hover:bg-[#7d94a8] text-white border-[#8DA4B8]"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="end">
          <p className="text-sm font-medium text-gray-500 mb-3">Status</p>
          <div className="space-y-2">
            {STATUS_FILTERS.map((filter) => (
              <label
                key={filter.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedFilters.includes(filter.value)}
                  onCheckedChange={() => toggleFilter(filter.value)}
                />
                <span className="text-sm text-gray-700">{filter.label}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* New Project Button */}
      {canCreate && (
        <Button
          className="bg-[#C8D84D] hover:bg-[#b8c844] text-gray-700 border-[#C8D84D]"
          onClick={() => navigate('/projects/create')}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9 w-48 bg-[#4A6572] border-[#4A6572] text-white placeholder:text-gray-300"
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Projects" actions={headerActions}>
      {/* Project Grid / List */}
      {isLoading ? (
        viewMode === 'dashboard' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-8">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-8">
          {projects.map((project) => {
            const status = project.status ?? 'new';

            let statusLabel = 'Light Count';
            let statusColor = 'bg-[#5B9AA9]';
            let buttonLabel = 'Property Info';
            let buttonStyle = 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300';

            if (status === 'approved') {
              statusLabel = 'Approved';
              statusColor = 'bg-[#6B9B7A]';
              buttonLabel = 'Estimate';
              buttonStyle = 'bg-[#6B9B7A] hover:bg-[#5a8a69] text-white';
            } else if (status === 'proposal') {
              statusLabel = 'Proposal Review';
              statusColor = 'bg-[#C8B44D]';
              buttonLabel = 'View Proposal';
              buttonStyle = 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300';
            }

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
                <DragHandle />
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 shrink-0 mx-3" />

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

                <div className={`px-3 py-1 rounded text-xs font-medium text-white shrink-0 mx-4 ${statusColor}`}>
                  {statusLabel}
                </div>

                <button
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${buttonStyle}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${project.id}`);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  {buttonLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="mt-8 space-y-4">
        {/* Hidden Section */}
        <Collapsible open={hiddenOpen} onOpenChange={setHiddenOpen}>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
            <Input
              readOnly
              value="Hidden"
              className="bg-transparent border-none font-medium text-gray-700 w-auto"
            />
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-gray-200 rounded">
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform ${hiddenOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="py-4 px-4 text-sm text-gray-500">
              No hidden projects
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Closed Section */}
        <Collapsible open={closedOpen} onOpenChange={setClosedOpen}>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
            <Input
              readOnly
              value="Closed"
              className="bg-transparent border-none font-medium text-gray-700 w-auto"
            />
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-gray-200 rounded">
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform ${closedOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="py-4 px-4 text-sm text-gray-500">
              No closed projects
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Archived Section */}
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
            <Input
              readOnly
              value="Archived"
              className="bg-transparent border-none font-medium text-gray-700 w-auto"
            />
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-gray-200 rounded">
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform ${archivedOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="py-4 px-4 text-sm text-gray-500">
              No archived projects
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-10 mb-4">
          <button
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>

          {getPageNumbers().map((p) => (
            <button
              key={p}
              className={`min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors ${
                p === page
                  ? 'text-pink-600 bg-pink-50'
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
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
