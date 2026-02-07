import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useOrderPortal, PortalOrder } from '@/hooks/useOrderPortal';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from '@/hooks/useMessages';

const SELECTED_EVENT_KEY = 'attendee_selected_event';

// Conversation types (shared with useConversations hook)
export interface ConversationParticipant {
  type: 'attendee' | 'speaker';
  id: string;
  name: string;
  avatar_url?: string;
}

export interface LastMessage {
  id: string;
  content: string;
  created_at: string;
  sender_attendee_id?: string;
  sender_speaker_id?: string;
}

export interface Conversation {
  id: string;
  event_id: string;
  type: 'direct' | 'group' | 'session' | 'event';
  name?: string;
  description?: string;
  agenda_item_id?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_message?: LastMessage;
  unread_count: number;
  other_participant?: ConversationParticipant;
  participant_count: number;
  role?: string;
  muted_until?: string;
}
const SELECTED_ATTENDEE_KEY = 'attendee_selected_attendee';

interface AttendeeEvent {
  id: string;
  title: string;
  slug: string;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  venue_address: string | null;
  cover_image_url: string | null;
}

interface AttendeeInfo {
  id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  ticket_type_id: string;
  ticket_type_name?: string;
}

interface Bookmark {
  id: string;
  attendee_id: string;
  agenda_item_id: string;
  created_at: string;
}

interface AttendeeContextType {
  // Auth state from order portal
  isAuthenticated: boolean;
  email: string | null;
  loading: boolean;
  error: string | null;
  
  // Auth methods
  sendCode: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyCode: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  
  // Orders and events
  orders: PortalOrder[];
  events: AttendeeEvent[];
  
  // Selection state
  selectedEvent: AttendeeEvent | null;
  selectedAttendee: AttendeeInfo | null;
  setSelectedEventId: (eventId: string) => void;
  
  // Bookmarks
  bookmarks: Bookmark[];
  bookmarkedItemIds: Set<string>;
  toggleBookmark: (agendaItemId: string) => Promise<{ success: boolean }>;
  refreshBookmarks: () => Promise<void>;
  
  // Conversations
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  refreshConversations: () => Promise<void>;
  totalUnread: number;
  
  // Message cache (for stale-while-revalidate)
  messagesCache: Map<string, Message[]>;
  getCachedMessages: (conversationId: string) => Message[] | undefined;
  setCachedMessages: (conversationId: string, messages: Message[]) => void;
  prefetchMessages: (conversationId: string) => void;
  
  // Session info
  sessionToken: string | null;
}

const AttendeeContext = createContext<AttendeeContextType | undefined>(undefined);

export function AttendeeProvider({ children }: { children: ReactNode }) {
  const orderPortal = useOrderPortal();
  
  const [selectedEventId, setSelectedEventIdState] = useState<string | null>(() => {
    return localStorage.getItem(SELECTED_EVENT_KEY);
  });
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  
  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const conversationIdsRef = useRef<string[]>([]);
  
  // Message cache for stale-while-revalidate pattern
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const prefetchingRef = useRef<Set<string>>(new Set());

  // Get session token from localStorage
  const getSessionToken = useCallback(() => {
    const stored = localStorage.getItem('order_portal_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (new Date(parsed.expires_at) > new Date()) {
          return parsed.session_token;
        }
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Extract unique events from orders
  const events: AttendeeEvent[] = React.useMemo(() => {
    const eventMap = new Map<string, AttendeeEvent>();
    orderPortal.orders.forEach(order => {
      if (order.event && order.status === 'completed') {
        eventMap.set(order.event.id, order.event);
      }
    });
    return Array.from(eventMap.values());
  }, [orderPortal.orders]);

  // Get selected event
  const selectedEvent = React.useMemo(() => {
    if (!selectedEventId) return events[0] || null;
    return events.find(e => e.id === selectedEventId) || events[0] || null;
  }, [selectedEventId, events]);

  // Get attendee for selected event
  const selectedAttendee = React.useMemo(() => {
    if (!selectedEvent || !orderPortal.email) return null;
    
    for (const order of orderPortal.orders) {
      if (order.event?.id === selectedEvent.id && order.status === 'completed') {
        // Find attendee matching email
        const attendee = order.attendees.find(
          a => a.attendee_email?.toLowerCase() === orderPortal.email?.toLowerCase()
        );
        if (attendee) {
          // Get ticket type name
          const orderItem = order.order_items.find(
            oi => oi.id === attendee.order_item_id
          );
          return {
            ...attendee,
            ticket_type_name: orderItem?.ticket_type?.name,
          };
        }
      }
    }
    return null;
  }, [selectedEvent, orderPortal.orders, orderPortal.email]);

  // Set selected event ID
  const setSelectedEventId = useCallback((eventId: string) => {
    setSelectedEventIdState(eventId);
    localStorage.setItem(SELECTED_EVENT_KEY, eventId);
  }, []);

  // Fetch bookmarks
  const refreshBookmarks = useCallback(async () => {
    if (!orderPortal.email || !selectedAttendee) return;
    
    const sessionToken = getSessionToken();
    if (!sessionToken) return;
    
    setBookmarksLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-attendee-bookmarks', {
        body: {
          email: orderPortal.email,
          session_token: sessionToken,
          attendee_id: selectedAttendee.id,
        },
      });
      
      if (!error && data?.bookmarks) {
        setBookmarks(data.bookmarks);
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    } finally {
      setBookmarksLoading(false);
    }
  }, [orderPortal.email, selectedAttendee, getSessionToken]);

  // Toggle bookmark
  const toggleBookmark = useCallback(async (agendaItemId: string) => {
    if (!orderPortal.email || !selectedAttendee) {
      return { success: false };
    }
    
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      return { success: false };
    }

    // Optimistic update
    const isCurrentlyBookmarked = bookmarks.some(b => b.agenda_item_id === agendaItemId);
    
    if (isCurrentlyBookmarked) {
      setBookmarks(prev => prev.filter(b => b.agenda_item_id !== agendaItemId));
    } else {
      setBookmarks(prev => [...prev, {
        id: `temp-${Date.now()}`,
        attendee_id: selectedAttendee.id,
        agenda_item_id: agendaItemId,
        created_at: new Date().toISOString(),
      }]);
    }

    try {
      const { data, error } = await supabase.functions.invoke('toggle-attendee-bookmark', {
        body: {
          email: orderPortal.email,
          session_token: sessionToken,
          attendee_id: selectedAttendee.id,
          agenda_item_id: agendaItemId,
        },
      });
      
      if (error || !data?.success) {
        // Revert optimistic update on error
        await refreshBookmarks();
        return { success: false };
      }
      
      // Success - trust the optimistic update, no refresh needed
      return { success: true };
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      await refreshBookmarks();
      return { success: false };
    }
  }, [orderPortal.email, selectedAttendee, bookmarks, getSessionToken, refreshBookmarks]);

  // Bookmarked item IDs set for quick lookup
  const bookmarkedItemIds = React.useMemo(() => {
    return new Set(bookmarks.map(b => b.agenda_item_id));
  }, [bookmarks]);

  // Fetch bookmarks when attendee changes
  useEffect(() => {
    if (selectedAttendee && orderPortal.isAuthenticated) {
      refreshBookmarks();
    }
  }, [selectedAttendee?.id, orderPortal.isAuthenticated]);

  // Auto-select first event when available
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId, setSelectedEventId]);

  // === CONVERSATIONS ===
  
  // Fetch conversations (doesn't clear on transient null deps)
  const refreshConversations = useCallback(async () => {
    // Don't clear existing data - just skip fetch if not ready
    if (!orderPortal.email || !selectedAttendee || !selectedEvent) {
      return;
    }
    
    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    setConversationsLoading(true);
    setConversationsError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-attendee-conversations', {
        body: {
          email: orderPortal.email,
          session_token: sessionToken,
          attendee_id: selectedAttendee.id,
          event_id: selectedEvent.id
        }
      });

      if (fetchError) throw fetchError;
      if (data?.error) throw new Error(data.error);

      setConversations(data?.conversations || []);
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      setConversationsError(err.message);
    } finally {
      setConversationsLoading(false);
    }
  }, [orderPortal.email, selectedAttendee, selectedEvent, getSessionToken]);

  // Keep conversation IDs ref in sync (for stable realtime subscription)
  useEffect(() => {
    conversationIdsRef.current = conversations.map(c => c.id);
  }, [conversations]);

  // Realtime subscription for conversations (stable deps using ref)
  useEffect(() => {
    if (!selectedAttendee || !selectedEvent) return;

    const channel = supabase
      .channel(`conversations-${selectedAttendee.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendee_messages'
        },
        (payload) => {
          // Only refresh if the message is in one of user's conversations
          if (conversationIdsRef.current.includes(payload.new?.conversation_id)) {
            refreshConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `attendee_id=eq.${selectedAttendee.id}`
        },
        () => {
          // Refresh when participant status changes
          refreshConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAttendee?.id, selectedEvent?.id, refreshConversations]);

  // Fetch conversations when attendee changes
  useEffect(() => {
    if (selectedAttendee && selectedEvent && orderPortal.isAuthenticated) {
      refreshConversations();
    }
  }, [selectedAttendee?.id, selectedEvent?.id, orderPortal.isAuthenticated]);

  // Calculate total unread
  const totalUnread = React.useMemo(() => {
    return conversations.reduce((sum, c) => sum + c.unread_count, 0);
  }, [conversations]);

  // Message cache methods
  const getCachedMessages = useCallback((conversationId: string) => {
    return messagesCacheRef.current.get(conversationId);
  }, []);

  const setCachedMessages = useCallback((conversationId: string, messages: Message[]) => {
    messagesCacheRef.current.set(conversationId, messages);
  }, []);

  // Prefetch messages for a conversation (on hover/focus)
  const prefetchMessages = useCallback(async (conversationId: string) => {
    // Skip if already cached or prefetching
    if (messagesCacheRef.current.has(conversationId) || prefetchingRef.current.has(conversationId)) {
      return;
    }
    if (!orderPortal.email || !selectedAttendee) return;
    
    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    prefetchingRef.current.add(conversationId);

    try {
      const { data, error } = await supabase.functions.invoke('get-conversation-messages', {
        body: {
          email: orderPortal.email,
          session_token: sessionToken,
          attendee_id: selectedAttendee.id,
          conversation_id: conversationId,
          limit: 50
        }
      });

      if (!error && data?.messages) {
        messagesCacheRef.current.set(conversationId, data.messages);
      }
    } catch (err) {
      console.error('Failed to prefetch messages:', err);
    } finally {
      prefetchingRef.current.delete(conversationId);
    }
  }, [orderPortal.email, selectedAttendee, getSessionToken]);

  const value: AttendeeContextType = {
    isAuthenticated: orderPortal.isAuthenticated,
    email: orderPortal.email,
    loading: orderPortal.loading || bookmarksLoading || conversationsLoading,
    error: orderPortal.error,
    sendCode: orderPortal.sendCode,
    verifyCode: orderPortal.verifyCode,
    logout: orderPortal.logout,
    orders: orderPortal.orders,
    events,
    selectedEvent,
    selectedAttendee,
    setSelectedEventId,
    bookmarks,
    bookmarkedItemIds,
    toggleBookmark,
    refreshBookmarks,
    conversations,
    conversationsLoading,
    conversationsError,
    refreshConversations,
    totalUnread,
    messagesCache: messagesCacheRef.current,
    getCachedMessages,
    setCachedMessages,
    prefetchMessages,
    sessionToken: getSessionToken(),
  };

  return (
    <AttendeeContext.Provider value={value}>
      {children}
    </AttendeeContext.Provider>
  );
}

export function useAttendee() {
  const context = useContext(AttendeeContext);
  if (context === undefined) {
    throw new Error('useAttendee must be used within an AttendeeProvider');
  }
  return context;
}
