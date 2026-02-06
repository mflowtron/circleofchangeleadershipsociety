import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  venue_name: string | null;
  venue_address: string | null;
  starts_at: string;
  ends_at: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  travel_info: string | null;
  travel_contact_email: string | null;
}

export interface CreateEventData {
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  venue_name?: string;
  venue_address?: string;
  starts_at: string;
  ends_at?: string;
  cover_image_url?: string;
  is_published?: boolean;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

export function useEvents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('starts_at', { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
  });

  const publishedEventsQuery = useQuery({
    queryKey: ['events', 'published'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_published', true)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Event created',
        description: 'Your event has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...eventData }: UpdateEventData) => {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Event updated',
        description: 'Your event has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Event deleted',
        description: 'The event has been deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    events: eventsQuery.data ?? [],
    publishedEvents: publishedEventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    isLoadingPublished: publishedEventsQuery.isLoading,
    createEvent: createEventMutation.mutateAsync,
    updateEvent: updateEventMutation.mutateAsync,
    deleteEvent: deleteEventMutation.mutateAsync,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ['events', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as Event | null;
    },
    enabled: !!slug,
  });
}

export function useEventById(id: string) {
  return useQuery({
    queryKey: ['events', 'id', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Event | null;
    },
    enabled: !!id,
  });
}
