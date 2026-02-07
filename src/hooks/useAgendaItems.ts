import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Speaker } from './useSpeakers';

export type AgendaItemType = 'session' | 'break' | 'meal' | 'networking' | 'other';

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
  speaker_ids: string[] | null;
  created_at: string;
  updated_at: string;
  // Populated client-side from speaker_ids
  speakers?: Speaker[];
}

export type AgendaItemInsert = Omit<AgendaItem, 'id' | 'created_at' | 'updated_at' | 'speakers'>;
export type AgendaItemUpdate = Partial<Omit<AgendaItem, 'id' | 'event_id' | 'created_at' | 'updated_at' | 'speakers'>>;

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

      // Collect all speaker IDs from all items
      const allSpeakerIds = new Set<string>();
      items.forEach(item => {
        if (item.speaker_ids && Array.isArray(item.speaker_ids)) {
          item.speaker_ids.forEach((id: string) => allSpeakerIds.add(id));
        }
      });

      // Fetch all speakers referenced by agenda items
      let speakersMap = new Map<string, Speaker>();
      if (allSpeakerIds.size > 0) {
        const { data: speakers, error: speakersError } = await supabase
          .from('speakers')
          .select('*')
          .in('id', Array.from(allSpeakerIds));

        if (speakersError) throw speakersError;

        speakers?.forEach(speaker => {
          speakersMap.set(speaker.id, speaker as Speaker);
        });
      }

      // Merge speakers into agenda items
      const itemsWithSpeakers = items.map(item => ({
        ...item,
        speakers: (item.speaker_ids || [])
          .map((id: string) => speakersMap.get(id))
          .filter(Boolean) as Speaker[],
      }));

      return itemsWithSpeakers as AgendaItem[];
    },
    enabled: !!eventId,
  });

  const createAgendaItem = useMutation({
    mutationFn: async ({ item }: { item: AgendaItemInsert }) => {
      const { data, error } = await supabase
        .from('agenda_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
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
    mutationFn: async ({ id, updates }: { id: string; updates: AgendaItemUpdate }) => {
      const { data, error } = await supabase
        .from('agenda_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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
