import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useOrderPortal, PortalOrder } from '@/hooks/useOrderPortal';
import { supabase } from '@/integrations/supabase/client';

const SELECTED_EVENT_KEY = 'attendee_selected_event';
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
        // Revert optimistic update
        await refreshBookmarks();
        return { success: false };
      }
      
      // Refresh to get accurate data
      await refreshBookmarks();
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

  const value: AttendeeContextType = {
    isAuthenticated: orderPortal.isAuthenticated,
    email: orderPortal.email,
    loading: orderPortal.loading || bookmarksLoading,
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
