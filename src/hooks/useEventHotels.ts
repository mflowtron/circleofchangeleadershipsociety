import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EventHotel {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  description: string | null;
  image_url: string | null;
  rate_description: string | null;
  booking_url: string | null;
  sort_order: number;
}

export type HotelInsert = Omit<EventHotel, 'id'>;
export type HotelUpdate = Partial<Omit<EventHotel, 'id'>>;

// Hotels are now stored in the events.hotels JSONB column
export function useEventHotels(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: hotels = [], isLoading, error } = useQuery({
    queryKey: ['event-hotels', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select('hotels')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      
      // Parse the JSONB hotels array with type cast
      const hotelsArray = (data?.hotels as unknown as EventHotel[]) || [];
      return hotelsArray;
    },
    enabled: !!eventId,
  });

  const createHotel = useMutation({
    mutationFn: async (hotel: HotelInsert) => {
      if (!eventId) throw new Error('Event ID required');
      
      // Get current hotels
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('hotels')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      const currentHotels = (currentEvent?.hotels as unknown as EventHotel[]) || [];
      const newHotel: EventHotel = {
        ...hotel,
        id: crypto.randomUUID(),
      };

      // Update with new hotel added
      const { error: updateError } = await supabase
        .from('events')
        .update({ hotels: [...currentHotels, newHotel] as unknown as Record<string, unknown>[] })
        .eq('id', eventId);

      if (updateError) throw updateError;
      return newHotel;
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
      if (!eventId) throw new Error('Event ID required');
      
      // Get current hotels
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('hotels')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      const currentHotels = (currentEvent?.hotels as unknown as EventHotel[]) || [];
      const updatedHotels = currentHotels.map(hotel => 
        hotel.id === id ? { ...hotel, ...updates } : hotel
      );

      // Update with modified hotels array
      const { error: updateError } = await supabase
        .from('events')
        .update({ hotels: updatedHotels as unknown as Record<string, unknown>[] })
        .eq('id', eventId);

      if (updateError) throw updateError;
      return updatedHotels.find(h => h.id === id);
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
      if (!eventId) throw new Error('Event ID required');
      
      // Get current hotels
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('hotels')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      const currentHotels = (currentEvent?.hotels as unknown as EventHotel[]) || [];
      const filteredHotels = currentHotels.filter(hotel => hotel.id !== id);

      // Update with hotel removed
      const { error: updateError } = await supabase
        .from('events')
        .update({ hotels: filteredHotels as unknown as Record<string, unknown>[] })
        .eq('id', eventId);

      if (updateError) throw updateError;
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
