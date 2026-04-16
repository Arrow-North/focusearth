import { useCompanyChanges } from '@/hooks/use-companies';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';

interface CompanyChangesLogProps {
  companyId: number;
}

export function CompanyChangesLog({ companyId }: CompanyChangesLogProps) {
  const { data: changes, isLoading, error } = useCompanyChanges(companyId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load changes: {(error as Error).message}
      </p>
    );
  }

  if (!changes || changes.length === 0) {
    return <p className="text-sm text-muted-foreground">No changes recorded.</p>;
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="relative pl-6 space-y-0">
        {/* Timeline line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

        {changes.map((change) => (
          <div key={change.id} className="relative pb-6">
            {/* Dot */}
            <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full border bg-background">
              <Clock className="h-3 w-3 text-muted-foreground" />
            </div>

            <div className="ml-2">
              <p className="text-sm">{change.update_log}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(change.updated_date).toLocaleString()}
                {change.updated_by_id && (
                  <span className="ml-2">by {change.updated_by_id}</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
