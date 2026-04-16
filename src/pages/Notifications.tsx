import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useNotifications, useMarkSeen } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Check, ChevronLeft, ChevronRight } from 'lucide-react';

type SeenFilter = 'all' | 'unseen' | 'seen';

export default function Notifications() {
  const [page, setPage] = useState(1);
  const [seenFilter, setSeenFilter] = useState<SeenFilter>('unseen');
  const pageSize = 20;

  const serverUnseenOnly = seenFilter === 'unseen';
  const { data, isLoading, error } = useNotifications(page, pageSize, serverUnseenOnly);
  const markSeen = useMarkSeen();

  const notifications = data?.rows ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // "unseen" is filtered server-side; "seen" is client-side from the full list
  const filtered =
    seenFilter === 'seen'
      ? notifications.filter((n) => n.seen)
      : notifications;

  const handleMarkSeen = (ids: number[]) => {
    markSeen.mutate(ids);
  };

  const handleMarkAllSeen = () => {
    const unseenIds = notifications.filter((n) => !n.seen).map((n) => n.id);
    if (unseenIds.length > 0) markSeen.mutate(unseenIds);
  };

  return (
    <DashboardLayout
      title="Notifications"
      actions={
        <Button variant="outline" size="sm" onClick={handleMarkAllSeen}>
          <Check className="mr-2 h-4 w-4" />
          Mark all as seen
        </Button>
      }
    >
      <div className="max-w-3xl space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select
            value={seenFilter}
            onValueChange={(v) => { setSeenFilter(v as SeenFilter); setPage(1); }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unseen">Unseen</SelectItem>
              <SelectItem value="seen">Seen</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground">
            {totalCount} notification{totalCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-destructive">
            Failed to load notifications: {(error as Error).message}
          </p>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-10 w-10 mb-3" />
            <p>No notifications found.</p>
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {filtered.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                'transition-colors',
                !notification.seen && 'border-l-4 border-l-primary bg-primary/5',
              )}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {notification.sender_name && (
                      <span className="font-medium text-sm">
                        {notification.sender_name}
                      </span>
                    )}
                    {!notification.seen && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{notification.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {notification.created_at
                      ? new Date(notification.created_at).toLocaleString()
                      : ''}
                  </p>
                </div>

                {!notification.seen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkSeen([notification.id])}
                    disabled={markSeen.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
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
        )}
      </div>
    </DashboardLayout>
  );
}
