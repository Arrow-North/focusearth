import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Notification, PaginatedResult } from '@/types/database';

// ─── useNotifications ───────────────────────────────────────────────────────

export function useNotifications(page = 1, pageSize = 20, unseenOnly = false) {
  return useQuery({
    queryKey: ['notifications', page, pageSize, unseenOnly],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_list_notifications', {
        p_page: page,
        p_page_size: pageSize,
        p_unseen_only: unseenOnly,
      });
      if (error) throw error;
      return data as unknown as PaginatedResult<Notification>;
    },
  });
}

// ─── useUnseenCount ─────────────────────────────────────────────────────────

export function useUnseenCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', 'unseen-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notification')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user!.id)
        .eq('seen', false);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30_000, // poll every 30 seconds
  });
}

// ─── useMarkSeen ────────────────────────────────────────────────────────────

export function useMarkSeen() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: number[]) => {
      const { error } = await supabase.rpc('fn_mark_notifications_seen', {
        p_notification_ids: notificationIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to mark as seen');
    },
  });
}

// ─── useConvertToActivity ───────────────────────────────────────────────────

export function useConvertToActivity() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const { error } = await supabase.rpc('fn_convert_notification_to_activity', {
        p_notification_id: notificationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Converted to activity');
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to convert notification');
    },
  });
}
