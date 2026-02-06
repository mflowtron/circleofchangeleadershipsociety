import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EventHotel {
  id: string;
  event_id: string;
  name: string;
  address: string;
  phone: string | null;
  description: string | null;
  image_url: string | null;
  rate_description: string | null;
  booking_url: string | null;
  sort_order: number;
  created_at: string;
}

export type HotelInsert = Omit<EventHotel, 'id' | 'created_at'>;
export type HotelUpdate = Partial<Omit<EventHotel, 'id' | 'event_id' | 'created_at'>>;

export function useEventHotels(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: hotels = [], isLoading, error } = useQuery({
    queryKey: ['event-hotels', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('event_hotels')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as EventHotel[];
    },
    enabled: !!eventId,
  });

  const createHotel = useMutation({
    mutationFn: async (hotel: HotelInsert) => {
      const { data, error } = await supabase
        .from('event_hotels')
        .insert(hotel)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-hotels', eventId] });
      toast.success('Hotel added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add hotel: ${error.message}`);
    },
  });

  const updateHotel = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & HotelUpdate) => {
      const { data, error } = await supabase
        .from('event_hotels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-hotels', eventId] });
      toast.success('Hotel updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update hotel: ${error.message}`);
    },
  });

  const deleteHotel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('event_hotels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-hotels', eventId] });
      toast.success('Hotel deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete hotel: ${error.message}`);
    },
  });

  const uploadImage = async (file: File, hotelId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `hotels/${eventId}/${hotelId}.${fileExt}`;

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
    hotels,
    isLoading,
    error,
    createHotel,
    updateHotel,
    deleteHotel,
    uploadImage,
  };
}
