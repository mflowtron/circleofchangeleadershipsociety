import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface OrderEvent {
  id: string;
  title: string;
  slug: string;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  venue_address: string | null;
  cover_image_url: string | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price_cents: number;
  ticket_type: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface Attendee {
  id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  ticket_type_id: string;
  order_item_id: string;
  is_purchaser: boolean;
}

interface OrderMessage {
  id: string;
  message: string;
  is_important: boolean;
  read_at: string | null;
  created_at: string;
  sender_type: string;
  sender_email: string | null;
}

export interface PortalOrder {
  id: string;
  order_number: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  email: string;
  full_name: string;
  total_cents: number;
  created_at: string;
  purchaser_is_attending: boolean | null;
  event: OrderEvent | null;
  order_items: OrderItem[];
  attendees: Attendee[];
  order_messages: OrderMessage[];
  attendee_stats: {
    total: number;
    registered: number;
    remaining: number;
  };
  unread_messages: number;
}

export function useOrderPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setInitializing(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch orders when user is available
  useEffect(() => {
    if (user?.email) {
      fetchOrders();
    } else {
      setOrders([]);
    }
  }, [user?.email]);

  const sendMagicLink = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/my-orders/dashboard`,
        },
      });

      if (authError) throw authError;

      return { success: true, message: 'Check your email for the magic link!' };
    } catch (err: any) {
      const message = err.message || 'Failed to send magic link';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user?.email) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-orders-by-email', {
        body: {},
      });

      if (fnError) throw fnError;
      if (data.error) {
        if (data.error === 'Unauthorized') {
          logout();
        }
        throw new Error(data.error);
      }

      setOrders(data.orders || []);
    } catch (err: any) {
      const message = err.message || 'Failed to fetch orders';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  const updateAttendee = useCallback(async (attendeeId: string, name: string, email: string) => {
    if (!user) return { success: false, message: 'Not authenticated' };

    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('update-attendee-public', {
        body: {
          attendee_id: attendeeId,
          attendee_name: name,
          attendee_email: email,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      // Refresh orders to get updated data
      await fetchOrders();
      return { success: true };
    } catch (err: any) {
      const message = err.message || 'Failed to update attendee';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [user, fetchOrders]);

  const markMessageRead = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('mark-message-read', {
        body: {
          message_id: messageId,
        },
      });

      if (!fnError && !data.error) {
        // Update local state
        setOrders(prev => prev.map(order => ({
          ...order,
          order_messages: order.order_messages.map(msg =>
            msg.id === messageId ? { ...msg, read_at: new Date().toISOString() } : msg
          ),
          unread_messages: order.order_messages.filter(m => m.id !== messageId && !m.read_at).length,
        })));
      }
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  }, [user]);

  const sendMessage = useCallback(async (orderId: string, message: string) => {
    if (!user) return { success: false, message: 'Not authenticated' };

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-customer-message', {
        body: {
          order_id: orderId,
          message,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      // Add the new message to local state
      if (data.message) {
        setOrders(prev => prev.map(order => 
          order.id === orderId
            ? {
                ...order,
                order_messages: [data.message, ...order.order_messages],
              }
            : order
        ));
      }

      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send message';
      return { success: false, message: errorMessage };
    }
  }, [user]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrders([]);
  }, []);

  return {
    isAuthenticated: !!user,
    email: user?.email || null,
    orders,
    loading: loading || initializing,
    error,
    sendMagicLink,
    fetchOrders,
    updateAttendee,
    markMessageRead,
    sendMessage,
    logout,
  };
}
