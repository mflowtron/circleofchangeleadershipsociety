import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Updated interface to match new schema - no more order_id, ticket_type_id, is_purchaser columns
export interface Attendee {
  id: string;
  order_item_id: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  user_id: string | null;
  is_speaker: boolean;
  additional_info: Record<string, unknown> | null;
  track_access: string[] | null;
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

      // Join through order_items to get order and ticket_type info
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          order_item:order_items(
            id,
            ticket_type:ticket_types(name),
            order:orders(order_number, full_name, email, event_id)
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform to flatten structure and filter by event_id
      const attendees = (data || [])
        .filter(a => a.order_item?.order?.event_id === eventId)
        .map(a => ({
          ...a,
          ticket_type: a.order_item?.ticket_type,
          order: a.order_item?.order,
        }));

      return attendees as Attendee[];
    },
    enabled: !!eventId,
  });
}

export function useOrderAttendees(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order-attendees', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      // Join through order_items to filter by order_id
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          order_item:order_items!inner(
            id,
            order_id,
            ticket_type:ticket_types(name)
          )
        `)
        .eq('order_item.order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform to flatten structure
      const attendees = (data || []).map(a => ({
        ...a,
        ticket_type: a.order_item?.ticket_type,
      }));

      return attendees as Attendee[];
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

      // Join through order_items to filter by event_id
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          id,
          attendee_name,
          attendee_email,
          order_item:order_items!inner(
            order:orders!inner(event_id)
          )
        `)
        .eq('order_item.order.event_id', eventId);

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
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          order_item:order_items(
            id,
            ticket_type:ticket_types(name),
            order:orders(order_number, full_name, email, event_id)
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform and filter by event_ids if provided
      let attendees = (data || []).map(a => ({
        ...a,
        ticket_type: a.order_item?.ticket_type,
        order: a.order_item?.order,
      }));

      if (eventIds && eventIds.length > 0) {
        attendees = attendees.filter(a => 
          a.order?.event_id && eventIds.includes(a.order.event_id)
        );
      }

      return attendees as Attendee[];
    },
  });
}
