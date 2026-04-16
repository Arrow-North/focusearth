import { useAuth } from '@/hooks/useAuth';
import { USER_TYPE_LABELS } from '@/lib/roles';
import type { UserType } from '@/types/database';
import type { UserFilters as Filters } from '@/hooks/use-users';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

const ALL_USER_TYPES: UserType[] = ['SUPERADMIN', 'Sa', 'Au', 'Reu', 'Su', 'Eu', 'Gu'];

interface UserFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  const { isAdmin } = useAuth();

  const update = (partial: Partial<Filters>) => {
    onFiltersChange({ ...filters, ...partial, page: 1 });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={filters.search ?? ''}
          onChange={(e) => update({ search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* User Type */}
      <Select
        value={filters.userType ?? '__all__'}
        onValueChange={(v) => update({ userType: v === '__all__' ? null : (v as UserType) })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Types</SelectItem>
          {ALL_USER_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {USER_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Company filter - admin only */}
      {isAdmin && (
        <Input
          type="number"
          placeholder="Company ID"
          value={filters.companyId ?? ''}
          onChange={(e) =>
            update({
              companyId: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="w-[140px]"
        />
      )}

      {/* Enabled toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="enabled-filter"
          checked={filters.enabled ?? true}
          onCheckedChange={(checked) => update({ enabled: checked })}
        />
        <Label htmlFor="enabled-filter" className="text-sm">
          Active only
        </Label>
      </div>
    </div>
  );
}
