import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Order {
  id: string;
  order_number: string;
  event_id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  subtotal_cents: number;
  fees_cents: number;
  total_cents: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price_cents: number;
  created_at: string;
  ticket_type?: {
    name: string;
  };
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export function useEventOrders(eventId: string) {
  return useQuery({
    queryKey: ['orders', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            ticket_type:ticket_types (name)
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrderWithItems[];
    },
    enabled: !!eventId,
  });
}

export function useEventOrderStats(eventId: string) {
  return useQuery({
    queryKey: ['order-stats', eventId],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status, total_cents')
        .eq('event_id', eventId);

      if (error) throw error;

      const completed = orders.filter(o => o.status === 'completed');
      const pending = orders.filter(o => o.status === 'pending');

      return {
        totalOrders: orders.length,
        completedOrders: completed.length,
        pendingOrders: pending.length,
        totalRevenue: completed.reduce((sum, o) => sum + o.total_cents, 0),
      };
    },
    enabled: !!eventId,
  });
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            ticket_type:ticket_types (name)
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as OrderWithItems;
    },
    enabled: !!orderId,
  });
}

export function useMultiEventOrders(eventIds: string[] | null) {
  return useQuery({
    queryKey: ['orders', 'multi', eventIds],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            ticket_type:ticket_types (name)
          )
        `)
        .order('created_at', { ascending: false });

      // If eventIds is provided and not empty, filter by those events
      if (eventIds && eventIds.length > 0) {
        query = query.in('event_id', eventIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OrderWithItems[];
    },
  });
}
