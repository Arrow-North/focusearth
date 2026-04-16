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
import { SlidersHorizontal, Plus, Loader2 } from "lucide-react";
import { useUsers } from "@/hooks/use-users";
import { usePagination } from "@/hooks/use-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { getUserTypeColor, USER_TYPE_LABELS } from "@/lib/roles";
import { getInitials } from "@/lib/formatters";
import type { UserType } from "@/types/database";

const colorMap: Record<string, string> = {
  yellow: "bg-status-yellow",
  purple: "bg-status-purple",
  teal: "bg-status-teal",
  blue: "bg-status-blue",
  pink: "bg-status-pink",
  orange: "bg-status-orange",
  green: "bg-status-green",
  brown: "bg-status-brown",
};

export default function UsersPage() {
  const navigate = useNavigate();
  const { page, setPage, pageSize } = usePagination(20);
  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<UserType | "all">("all");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading: loading } = useUsers({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    userType: userTypeFilter !== "all" ? userTypeFilter : undefined,
  });

  const users = data?.rows ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleUserTypeChange = (value: string) => {
    setUserTypeFilter(value as UserType | "all");
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const headerActions = (
    <>
      <Select value={userTypeFilter} onValueChange={handleUserTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {Object.entries(USER_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
        <Plus className="h-4 w-4 mr-2" />
        Add New User
      </Button>
    </>
  );

  return (
    <DashboardLayout title="Users" actions={headerActions}>
      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={handleSearchChange}
          className="max-w-md"
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && users.length === 0 && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          No users found
        </div>
      )}

      {/* User grid */}
      {!loading && users.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => {
              const typeColor = getUserTypeColor(user.type);
              const initials = getInitials(user.first_name, user.last_name);
              const bgClass = colorMap[typeColor] ?? "bg-status-blue";

              return (
                <div
                  key={user.id}
                  onClick={() => navigate(`/users/${user.id}`)}
                  className="bg-card rounded-lg border border-border flex items-center overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Color stripe */}
                  <div className={`w-1.5 h-16 ${bgClass}`} />

                  <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
                    {/* Avatar */}
                    {user.avatar ? (
                      <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                        <img
                          src={user.avatar}
                          alt={`${user.first_name} ${user.last_name}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full ${bgClass} flex-shrink-0 flex items-center justify-center`}
                      >
                        <span className="text-sm font-medium text-primary-foreground">
                          {initials}
                        </span>
                      </div>
                    )}

                    <div className="min-w-0">
                      <span className="font-medium text-foreground block truncate">
                        {user.first_name} {user.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground block truncate">
                        {USER_TYPE_LABELS[user.type] ?? user.type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
