import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AudienceType = 'all' | 'in_person' | 'virtual' | 'ticket_type' | 'individual';

export interface AudienceFilter {
  ticket_type_ids?: string[];
  attendee_ids?: string[];
}

export interface PushNotification {
  id: string;
  event_id: string;
  created_by: string;
  title: string;
  message: string;
  redirect_url: string | null;
  audience_type: string;
  audience_filter: AudienceFilter | null;
  recipient_count: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface SendNotificationParams {
  event_id: string;
  title: string;
  message: string;
  redirect_url?: string;
  audience_type: AudienceType;
  audience_filter?: AudienceFilter;
}

export function usePushNotifications(eventId: string | null) {
  const queryClient = useQueryClient();

  // Fetch notification history for the event
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['push-notifications', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('push_notifications')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PushNotification[];
    },
    enabled: !!eventId,
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (params: SendNotificationParams) => {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['push-notifications', eventId] });
      toast.success(`Notification sent to ${data.recipient_count} attendees`);
    },
    onError: (error: Error) => {
      console.error('Failed to send notification:', error);
      toast.error('Failed to send notification: ' + error.message);
    },
  });

  const sendNotification = useCallback(
    (params: Omit<SendNotificationParams, 'event_id'>) => {
      if (!eventId) {
        toast.error('No event selected');
        return;
      }
      return sendNotificationMutation.mutateAsync({ ...params, event_id: eventId });
    },
    [eventId, sendNotificationMutation]
  );

  return {
    notifications: notifications ?? [],
    isLoading,
    isSending: sendNotificationMutation.isPending,
    sendNotification,
    refetch,
  };
}

// Hook to get audience counts for preview
export function useAudienceCounts(eventId: string | null) {
  return useQuery({
    queryKey: ['audience-counts', eventId],
    queryFn: async () => {
      if (!eventId) return null;

      // Get all attendees for the event with their ticket types
      const { data: attendees, error } = await supabase
        .from('attendees')
        .select(`
          id,
          user_id,
          order_item_id,
          order_items!inner(
            ticket_type_id,
            orders!inner(event_id, status),
            ticket_types!inner(id, name, is_virtual)
          )
        `)
        .not('order_item_id', 'is', null);

      if (error) throw error;

      // Filter to only completed orders for this event
      const eventAttendees = attendees?.filter(a => {
        const orderItem = a.order_items as any;
        return orderItem?.orders?.event_id === eventId && 
               orderItem?.orders?.status === 'completed';
      }) || [];

      const total = eventAttendees.length;
      const inPerson = eventAttendees.filter(a => {
        const orderItem = a.order_items as any;
        return !orderItem?.ticket_types?.is_virtual;
      }).length;
      const virtual = eventAttendees.filter(a => {
        const orderItem = a.order_items as any;
        return orderItem?.ticket_types?.is_virtual;
      }).length;

      // Get unique ticket types
      const ticketTypeMap = new Map<string, { id: string; name: string; count: number }>();
      eventAttendees.forEach(a => {
        const orderItem = a.order_items as any;
        const ticketType = orderItem?.ticket_types;
        if (ticketType) {
          const existing = ticketTypeMap.get(ticketType.id);
          if (existing) {
            existing.count++;
          } else {
            ticketTypeMap.set(ticketType.id, {
              id: ticketType.id,
              name: ticketType.name,
              count: 1,
            });
          }
        }
      });

      return {
        total,
        inPerson,
        virtual,
        ticketTypes: Array.from(ticketTypeMap.values()),
        attendees: eventAttendees.map(a => ({
          id: a.id,
          user_id: a.user_id,
        })),
      };
    },
    enabled: !!eventId,
  });
}
