import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrderMessage {
  id: string;
  order_id: string;
  message: string;
  is_important: boolean;
  created_by: string | null;
  read_at: string | null;
  created_at: string;
  sender_type: string;
  sender_email: string | null;
}

export function useOrderMessages(orderId: string | undefined) {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-messages-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          // Invalidate the query to refetch messages
          queryClient.invalidateQueries({ queryKey: ['order-messages', orderId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  return useQuery({
    queryKey: ['order-messages', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrderMessage[];
    },
    enabled: !!orderId,
  });
}

export function useCreateOrderMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      orderId, 
      message, 
      isImportant 
    }: { 
      orderId: string; 
      message: string; 
      isImportant: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('order_messages')
        .insert({
          order_id: orderId,
          message,
          is_important: isImportant,
          created_by: user.id,
          sender_type: 'organizer',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order-messages', variables.orderId] });
    },
  });
}
