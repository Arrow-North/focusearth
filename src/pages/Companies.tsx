import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanies } from "@/hooks/use-companies";
import { useDebounce } from "@/hooks/use-debounce";
import { SlidersHorizontal, Plus, Search, Loader2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const typeColorMap: Record<string, string> = {
  REU: "bg-status-purple",
  SU: "bg-status-yellow",
  EU: "bg-status-teal",
};

export default function Companies() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useCompanies({
    search: debouncedSearch || undefined,
    type: typeFilter,
    page,
    pageSize,
  });

  const companies = data?.rows ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const headerActions = (
    <>
      <Select
        value={typeFilter ?? "all"}
        onValueChange={(value) => {
          setTypeFilter(value === "all" ? null : value);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="REU">REU</SelectItem>
          <SelectItem value="SU">SU</SelectItem>
          <SelectItem value="EU">EU</SelectItem>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Add New Company
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }} className="p-1.5 gap-1.5 flex flex-col">
          <DropdownMenuItem onClick={() => navigate("/companies/create/reu")} className="bg-purple-500 hover:bg-purple-600 focus:bg-purple-600 text-white font-medium py-2.5 justify-center cursor-pointer rounded-md">
            Real Estate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/companies/create/su")} className="bg-yellow-500 hover:bg-yellow-600 focus:bg-yellow-600 text-white font-medium py-2.5 justify-center cursor-pointer rounded-md">
            Supplier
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/companies/create/eu")} className="bg-teal-500 hover:bg-teal-600 focus:bg-teal-600 text-white font-medium py-2.5 justify-center cursor-pointer rounded-md">
            Electrician
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <DashboardLayout title="Companies" actions={headerActions}>
      {/* Search input */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : companies.length === 0 ? (
        /* Empty state */
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          No companies found
        </div>
      ) : (
        /* Company grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <div
              key={company.id}
              onClick={() => navigate(`/companies/${company.id}`)}
              className="bg-card rounded-lg border border-border flex items-center overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Color stripe */}
              <div
                className={`w-1.5 h-16 ${
                  typeColorMap[company.type ?? ""] ?? "bg-muted"
                }`}
              />

              <div className="flex items-center gap-3 p-4 flex-1">
                {/* Company image or placeholder */}
                {company.image ? (
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={company.image}
                      alt={company.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground flex-shrink-0">
                    {company.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                )}

                <span className="font-medium text-foreground truncate">
                  {company.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, totalCount)} of{' '}
            {totalCount} companies
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
