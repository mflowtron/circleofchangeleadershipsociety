import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Attendee {
  id: string;
  order_id: string;
  order_item_id: string;
  ticket_type_id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  additional_info: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  ticket_type?: {
    name: string;
  };
  order?: {
    order_number: string;
    full_name: string;
    email: string;
    event_id?: string;
  };
}

export function useEventAttendees(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          ticket_type:ticket_types(name),
          order:orders!inner(order_number, full_name, email, event_id)
        `)
        .eq('order.event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Attendee[];
    },
    enabled: !!eventId,
  });
}

export function useOrderAttendees(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order-attendees', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          ticket_type:ticket_types(name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Attendee[];
    },
    enabled: !!orderId,
  });
}

export function useUpdateAttendee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      attendee_name,
      attendee_email,
    }: {
      id: string;
      attendee_name?: string | null;
      attendee_email?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('attendees')
        .update({
          attendee_name,
          attendee_email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['order-attendees'] });
      queryClient.invalidateQueries({ queryKey: ['event-attendees'] });
    },
  });
}

export function useBulkUpdateAttendees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Array<{
        id: string;
        attendee_name?: string | null;
        attendee_email?: string | null;
      }>
    ) => {
      const results = await Promise.all(
        updates.map(async ({ id, attendee_name, attendee_email }) => {
          const { data, error } = await supabase
            .from('attendees')
            .update({
              attendee_name,
              attendee_email,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return data;
        })
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-attendees'] });
      queryClient.invalidateQueries({ queryKey: ['event-attendees'] });
    },
  });
}

export function useAttendeeStats(eventId: string | undefined) {
  return useQuery({
    queryKey: ['attendee-stats', eventId],
    queryFn: async () => {
      if (!eventId) return { total: 0, complete: 0, incomplete: 0 };

      const { data, error } = await supabase
        .from('attendees')
        .select(`
          id,
          attendee_name,
          attendee_email,
          order:orders!inner(event_id)
        `)
        .eq('order.event_id', eventId);

      if (error) throw error;

      const total = data?.length || 0;
      const complete = data?.filter(
        (a) => a.attendee_name && a.attendee_email
      ).length || 0;
      const incomplete = total - complete;

      return { total, complete, incomplete };
    },
    enabled: !!eventId,
  });
}

export function useMultiEventAttendees(eventIds: string[] | null) {
  return useQuery({
    queryKey: ['attendees', 'multi', eventIds],
    queryFn: async () => {
      let query = supabase
        .from('attendees')
        .select(`
          *,
          ticket_type:ticket_types(name),
          order:orders!inner(order_number, full_name, email, event_id)
        `)
        .order('created_at', { ascending: true });

      // If eventIds is provided and not empty, filter by those events
      if (eventIds && eventIds.length > 0) {
        query = query.in('order.event_id', eventIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Attendee[];
    },
  });
}
