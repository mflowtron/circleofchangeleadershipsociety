import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Speaker } from './useSpeakers';

export type AgendaItemType = 'session' | 'break' | 'meal' | 'networking' | 'other';
export type SpeakerRole = 'speaker' | 'moderator' | 'panelist';

export interface AgendaItemSpeaker {
  id: string;
  agenda_item_id: string;
  speaker_id: string;
  role: SpeakerRole;
  sort_order: number;
  created_at: string;
  speaker?: Speaker;
}

export interface AgendaItem {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  item_type: AgendaItemType;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  track: string | null;
  sort_order: number;
  is_highlighted: boolean;
  created_at: string;
  updated_at: string;
  speakers?: AgendaItemSpeaker[];
}

export type AgendaItemInsert = Omit<AgendaItem, 'id' | 'created_at' | 'updated_at' | 'speakers'>;
export type AgendaItemUpdate = Partial<Omit<AgendaItem, 'id' | 'event_id' | 'created_at' | 'updated_at' | 'speakers'>>;

export interface SpeakerAssignment {
  speaker_id: string;
  role: SpeakerRole;
}

export function useAgendaItems(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: agendaItems = [], isLoading, error } = useQuery({
    queryKey: ['agenda-items', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      // Fetch agenda items
      const { data: items, error: itemsError } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('event_id', eventId)
        .order('starts_at', { ascending: true })
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch speakers for all agenda items
      const itemIds = items.map(item => item.id);
      if (itemIds.length === 0) return items as AgendaItem[];

      const { data: itemSpeakers, error: speakersError } = await supabase
        .from('agenda_item_speakers')
        .select(`
          *,
          speaker:speakers(*)
        `)
        .in('agenda_item_id', itemIds)
        .order('sort_order', { ascending: true });

      if (speakersError) throw speakersError;

      // Merge speakers into agenda items
      const itemsWithSpeakers = items.map(item => ({
        ...item,
        speakers: itemSpeakers
          .filter(is => is.agenda_item_id === item.id)
          .map(is => ({
            ...is,
            speaker: is.speaker,
          })),
      }));

      return itemsWithSpeakers as AgendaItem[];
    },
    enabled: !!eventId,
  });

  const createAgendaItem = useMutation({
    mutationFn: async ({ 
      item, 
      speakerAssignments 
    }: { 
      item: AgendaItemInsert; 
      speakerAssignments?: SpeakerAssignment[] 
    }) => {
      const { data, error } = await supabase
        .from('agenda_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;

      // Add speaker assignments if provided
      if (speakerAssignments && speakerAssignments.length > 0) {
        const assignments = speakerAssignments.map((sa, index) => ({
          agenda_item_id: data.id,
          speaker_id: sa.speaker_id,
          role: sa.role,
          sort_order: index,
        }));

        const { error: assignError } = await supabase
          .from('agenda_item_speakers')
          .insert(assignments);

        if (assignError) throw assignError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items', eventId] });
      toast.success('Agenda item created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create agenda item: ${error.message}`);
    },
  });

  const updateAgendaItem = useMutation({
    mutationFn: async ({ 
      id, 
      updates, 
      speakerAssignments 
    }: { 
      id: string; 
      updates: AgendaItemUpdate; 
      speakerAssignments?: SpeakerAssignment[] 
    }) => {
      const { data, error } = await supabase
        .from('agenda_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update speaker assignments if provided
      if (speakerAssignments !== undefined) {
        // Remove existing assignments
        const { error: deleteError } = await supabase
          .from('agenda_item_speakers')
          .delete()
          .eq('agenda_item_id', id);

        if (deleteError) throw deleteError;

        // Add new assignments
        if (speakerAssignments.length > 0) {
          const assignments = speakerAssignments.map((sa, index) => ({
            agenda_item_id: id,
            speaker_id: sa.speaker_id,
            role: sa.role,
            sort_order: index,
          }));

          const { error: insertError } = await supabase
            .from('agenda_item_speakers')
            .insert(assignments);

          if (insertError) throw insertError;
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items', eventId] });
      toast.success('Agenda item updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update agenda item: ${error.message}`);
    },
  });

  const deleteAgendaItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenda_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items', eventId] });
      toast.success('Agenda item deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete agenda item: ${error.message}`);
    },
  });

  const reorderAgendaItems = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('agenda_items')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items', eventId] });
    },
    onError: (error) => {
      toast.error(`Failed to reorder agenda items: ${error.message}`);
    },
  });

  // Get unique tracks from agenda items
  const tracks = [...new Set(agendaItems.filter(i => i.track).map(i => i.track as string))];

  // Group items by date
  const itemsByDate = agendaItems.reduce((acc, item) => {
    const date = new Date(item.starts_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, AgendaItem[]>);

  return {
    agendaItems,
    itemsByDate,
    tracks,
    isLoading,
    error,
    createAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    reorderAgendaItems,
  };
}
