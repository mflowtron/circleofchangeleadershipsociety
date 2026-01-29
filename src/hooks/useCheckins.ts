import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface CheckIn {
  id: string;
  attendee_id: string;
  event_id: string;
  check_in_date: string;
  checked_in_at: string;
  checked_in_by: string | null;
  notes: string | null;
  created_at: string;
  attendee?: {
    id: string;
    attendee_name: string | null;
    attendee_email: string | null;
    ticket_type: {
      name: string;
    } | null;
    order: {
      order_number: string;
      full_name: string;
      email: string;
    } | null;
  };
}

export interface CheckInStats {
  total: number;
  checkedIn: number;
  percentage: number;
  byTicketType: Record<string, { total: number; checkedIn: number }>;
}

// Get all check-ins for an event on a specific date
export function useEventCheckins(eventId: string | undefined, date: string = format(new Date(), 'yyyy-MM-dd')) {
  return useQuery({
    queryKey: ['event-checkins', eventId, date],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('attendee_checkins')
        .select(`
          *,
          attendee:attendees(
            id,
            attendee_name,
            attendee_email,
            ticket_type:ticket_types(name),
            order:orders(order_number, full_name, email)
          )
        `)
        .eq('event_id', eventId)
        .eq('check_in_date', date)
        .order('checked_in_at', { ascending: false });

      if (error) throw error;
      return data as CheckIn[];
    },
    enabled: !!eventId,
  });
}

// Get all check-ins for an attendee
export function useAttendeeCheckins(attendeeId: string | undefined) {
  return useQuery({
    queryKey: ['attendee-checkins', attendeeId],
    queryFn: async () => {
      if (!attendeeId) return [];

      const { data, error } = await supabase
        .from('attendee_checkins')
        .select('*')
        .eq('attendee_id', attendeeId)
        .order('check_in_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!attendeeId,
  });
}

// Get check-in stats for an event on a specific date
export function useCheckInStats(eventId: string | undefined, date: string = format(new Date(), 'yyyy-MM-dd')) {
  return useQuery({
    queryKey: ['checkin-stats', eventId, date],
    queryFn: async (): Promise<CheckInStats> => {
      if (!eventId) return { total: 0, checkedIn: 0, percentage: 0, byTicketType: {} };

      // Get all attendees for the event
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select(`
          id,
          ticket_type:ticket_types(name),
          order:orders!inner(event_id)
        `)
        .eq('order.event_id', eventId);

      if (attendeesError) throw attendeesError;

      // Get all check-ins for the date
      const { data: checkins, error: checkinsError } = await supabase
        .from('attendee_checkins')
        .select('attendee_id')
        .eq('event_id', eventId)
        .eq('check_in_date', date);

      if (checkinsError) throw checkinsError;

      const checkedInIds = new Set(checkins?.map(c => c.attendee_id) || []);
      const total = attendees?.length || 0;
      const checkedIn = checkedInIds.size;

      // Group by ticket type
      const byTicketType: Record<string, { total: number; checkedIn: number }> = {};
      attendees?.forEach(attendee => {
        const typeName = (attendee.ticket_type as { name: string } | null)?.name || 'Unknown';
        if (!byTicketType[typeName]) {
          byTicketType[typeName] = { total: 0, checkedIn: 0 };
        }
        byTicketType[typeName].total++;
        if (checkedInIds.has(attendee.id)) {
          byTicketType[typeName].checkedIn++;
        }
      });

      return {
        total,
        checkedIn,
        percentage: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
        byTicketType,
      };
    },
    enabled: !!eventId,
  });
}

// Check if an attendee is already checked in for a date
export function useAttendeeCheckInStatus(
  attendeeId: string | undefined,
  eventId: string | undefined,
  date: string = format(new Date(), 'yyyy-MM-dd')
) {
  return useQuery({
    queryKey: ['attendee-checkin-status', attendeeId, eventId, date],
    queryFn: async () => {
      if (!attendeeId || !eventId) return null;

      const { data, error } = await supabase
        .from('attendee_checkins')
        .select('*')
        .eq('attendee_id', attendeeId)
        .eq('event_id', eventId)
        .eq('check_in_date', date)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!attendeeId && !!eventId,
  });
}

// Check in an attendee
export function useCheckIn() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      attendeeId,
      eventId,
      date = format(new Date(), 'yyyy-MM-dd'),
      notes,
    }: {
      attendeeId: string;
      eventId: string;
      date?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('attendee_checkins')
        .insert({
          attendee_id: attendeeId,
          event_id: eventId,
          check_in_date: date,
          checked_in_by: user?.id,
          notes,
        })
        .select(`
          *,
          attendee:attendees(
            id,
            attendee_name,
            attendee_email,
            ticket_type:ticket_types(name),
            order:orders(order_number, full_name, email)
          )
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Already checked in for today');
        }
        throw error;
      }
      return data as CheckIn;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-checkins', data.event_id] });
      queryClient.invalidateQueries({ queryKey: ['checkin-stats', data.event_id] });
      queryClient.invalidateQueries({ queryKey: ['attendee-checkins', data.attendee_id] });
      queryClient.invalidateQueries({ queryKey: ['attendee-checkin-status', data.attendee_id] });
    },
  });
}

// Undo a check-in
export function useUndoCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ checkinId, eventId, attendeeId }: { checkinId: string; eventId: string; attendeeId: string }) => {
      const { error } = await supabase
        .from('attendee_checkins')
        .delete()
        .eq('id', checkinId);

      if (error) throw error;
      return { eventId, attendeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-checkins', data.eventId] });
      queryClient.invalidateQueries({ queryKey: ['checkin-stats', data.eventId] });
      queryClient.invalidateQueries({ queryKey: ['attendee-checkins', data.attendeeId] });
      queryClient.invalidateQueries({ queryKey: ['attendee-checkin-status', data.attendeeId] });
    },
  });
}

// Lookup attendee by ID
export function useAttendeeById(attendeeId: string | undefined) {
  return useQuery({
    queryKey: ['attendee', attendeeId],
    queryFn: async () => {
      if (!attendeeId) return null;

      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          ticket_type:ticket_types(name),
          order:orders(order_number, full_name, email, event_id)
        `)
        .eq('id', attendeeId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!attendeeId,
  });
}
