import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Speaker {
  id: string;
  event_id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type SpeakerInsert = Omit<Speaker, 'id' | 'created_at' | 'updated_at'>;
export type SpeakerUpdate = Partial<Omit<Speaker, 'id' | 'event_id' | 'created_at' | 'updated_at'>>;

export function useSpeakers(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: speakers = [], isLoading, error } = useQuery({
    queryKey: ['speakers', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Speaker[];
    },
    enabled: !!eventId,
  });

  const createSpeaker = useMutation({
    mutationFn: async (speaker: SpeakerInsert) => {
      const { data, error } = await supabase
        .from('speakers')
        .insert(speaker)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speakers', eventId] });
      toast.success('Speaker created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create speaker: ${error.message}`);
    },
  });

  const updateSpeaker = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & SpeakerUpdate) => {
      const { data, error } = await supabase
        .from('speakers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speakers', eventId] });
      toast.success('Speaker updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update speaker: ${error.message}`);
    },
  });

  const deleteSpeaker = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('speakers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speakers', eventId] });
      toast.success('Speaker deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete speaker: ${error.message}`);
    },
  });

  const reorderSpeakers = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('speakers')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speakers', eventId] });
    },
    onError: (error) => {
      toast.error(`Failed to reorder speakers: ${error.message}`);
    },
  });

  const uploadPhoto = async (file: File, speakerId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `speakers/${eventId}/${speakerId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('event-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  return {
    speakers,
    isLoading,
    error,
    createSpeaker,
    updateSpeaker,
    deleteSpeaker,
    reorderSpeakers,
    uploadPhoto,
  };
}
