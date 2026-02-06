import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export function useEventHotels(eventId: string) {
  return useQuery({
    queryKey: ['event-hotels', eventId],
    queryFn: async () => {
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
}
