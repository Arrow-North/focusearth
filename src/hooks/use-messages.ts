import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Message } from '@/types/database';

// ─── useMessages ────────────────────────────────────────────────────────────

export function useMessages() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['messages', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!userId,
  });
}

// ─── useSendMessage ─────────────────────────────────────────────────────────

export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      receiverId,
      message,
    }: {
      receiverId: string;
      message: string;
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user!.id,
          receiver_id: receiverId,
          message,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Message;
    },
    onSuccess: () => {
      toast.success('Message sent');
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to send message');
    },
  });
}
