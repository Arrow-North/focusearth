import { useNavigate } from 'react-router-dom';
import { useUnseenCount, useNotifications, useMarkSeen } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bell, Check } from 'lucide-react';

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: unseenCount = 0 } = useUnseenCount();
  const { data: notificationsData } = useNotifications(1, 5, true);
  const markSeen = useMarkSeen();

  const notifications = notificationsData?.rows ?? [];

  const handleMarkSeen = (id: number) => {
    markSeen.mutate([id]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unseenCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
            >
              {unseenCount > 99 ? '99+' : unseenCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unseenCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unseenCount} unseen
            </span>
          )}
        </div>

        <Separator />

        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                    !n.seen && 'bg-primary/5',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    {n.sender_name && (
                      <p className="text-xs font-medium">{n.sender_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.description}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {n.created_at
                        ? new Date(n.created_at).toLocaleDateString()
                        : ''}
                    </p>
                  </div>
                  {!n.seen && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkSeen(n.id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => navigate('/notifications')}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
