import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LMSEvent {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  meeting_link: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLMSEventInput {
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  meeting_link?: string | null;
  is_active?: boolean;
}

export interface UpdateLMSEventInput extends Partial<CreateLMSEventInput> {
  id: string;
}

export function useLMSEvents() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin';

  // Fetch events - admins see all, others see only active
  const {
    data: events = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['lms-events', isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lms_events')
        .select('*')
        .order('starts_at', { ascending: true });

      if (error) throw error;
      return data as LMSEvent[];
    },
    enabled: !!user,
  });

  // Create event (admin only)
  const createEvent = useMutation({
    mutationFn: async (input: CreateLMSEventInput) => {
      const { data, error } = await supabase
        .from('lms_events')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-events'] });
      toast.success('Event created successfully');
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    },
  });

  // Update event (admin only)
  const updateEvent = useMutation({
    mutationFn: async ({ id, ...input }: UpdateLMSEventInput) => {
      const { data, error } = await supabase
        .from('lms_events')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-events'] });
      toast.success('Event updated successfully');
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    },
  });

  // Delete event (admin only)
  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lms_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-events'] });
      toast.success('Event deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    },
  });

  // Filter upcoming events (starts_at >= now)
  const upcomingEvents = events.filter(
    (event) => new Date(event.starts_at) >= new Date()
  );

  // Filter active upcoming events for regular users
  const activeUpcomingEvents = upcomingEvents.filter((event) => event.is_active);

  return {
    events,
    upcomingEvents: isAdmin ? upcomingEvents : activeUpcomingEvents,
    isLoading,
    error,
    refetch,
    createEvent,
    updateEvent,
    deleteEvent,
    isAdmin,
  };
}
