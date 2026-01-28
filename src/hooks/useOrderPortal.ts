import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'order_portal_session';

interface OrderPortalSession {
  email: string;
  session_token: string;
  expires_at: string;
}

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
  const [session, setSession] = useState<OrderPortalSession | null>(null);
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: OrderPortalSession = JSON.parse(stored);
        if (new Date(parsed.expires_at) > new Date()) {
          setSession(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Fetch orders when session is available
  useEffect(() => {
    if (session) {
      fetchOrders();
    }
  }, [session]);

  const sendCode = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-order-access-code', {
        body: { email },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      return { success: true, message: data.message };
    } catch (err: any) {
      const message = err.message || 'Failed to send access code';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-order-access-code', {
        body: { email, code },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      if (data.valid) {
        const newSession: OrderPortalSession = {
          email: data.email,
          session_token: data.session_token,
          expires_at: data.expires_at,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession);
        return { success: true };
      } else {
        throw new Error('Invalid code');
      }
    } catch (err: any) {
      const message = err.message || 'Failed to verify code';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-orders-by-email', {
        body: { email: session.email, session_token: session.session_token },
      });

      if (fnError) throw fnError;
      if (data.error) {
        if (data.error === 'Invalid or expired session') {
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
  }, [session]);

  const updateAttendee = useCallback(async (attendeeId: string, name: string, email: string) => {
    if (!session) return { success: false, message: 'Not authenticated' };

    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('update-attendee-public', {
        body: {
          email: session.email,
          session_token: session.session_token,
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
  }, [session, fetchOrders]);

  const markMessageRead = useCallback(async (messageId: string) => {
    if (!session) return;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('mark-message-read', {
        body: {
          email: session.email,
          session_token: session.session_token,
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
  }, [session]);

  const sendMessage = useCallback(async (orderId: string, message: string) => {
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-customer-message', {
        body: {
          email: session.email,
          session_token: session.session_token,
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
  }, [session]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setOrders([]);
  }, []);

  return {
    isAuthenticated: !!session,
    email: session?.email || null,
    orders,
    loading,
    error,
    sendCode,
    verifyCode,
    fetchOrders,
    updateAttendee,
    markMessageRead,
    sendMessage,
    logout,
  };
}
