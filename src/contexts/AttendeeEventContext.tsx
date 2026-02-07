import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAttendeeAuth } from './AttendeeAuthContext';

const SELECTED_EVENT_KEY = 'attendee_selected_event';

export interface AttendeeEvent {
  id: string;
  title: string;
  slug: string;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  venue_address: string | null;
  cover_image_url: string | null;
}

export interface AttendeeInfo {
  id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  ticket_type_id: string;
  ticket_type_name?: string;
}

interface AttendeeEventContextType {
  events: AttendeeEvent[];
  selectedEvent: AttendeeEvent | null;
  selectedAttendee: AttendeeInfo | null;
  setSelectedEventId: (eventId: string) => void;
}

const AttendeeEventContext = createContext<AttendeeEventContextType | undefined>(undefined);

export function AttendeeEventProvider({ children }: { children: ReactNode }) {
  const { orders, email } = useAttendeeAuth();

  const [selectedEventId, setSelectedEventIdState] = useState<string | null>(() => {
    return localStorage.getItem(SELECTED_EVENT_KEY);
  });

  // Extract unique events from orders
  const events: AttendeeEvent[] = useMemo(() => {
    const eventMap = new Map<string, AttendeeEvent>();
    orders.forEach(order => {
      if (order.event && order.status === 'completed') {
        eventMap.set(order.event.id, order.event);
      }
    });
    return Array.from(eventMap.values());
  }, [orders]);

  // Get selected event
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return events[0] || null;
    return events.find(e => e.id === selectedEventId) || events[0] || null;
  }, [selectedEventId, events]);

  // Get attendee for selected event
  const selectedAttendee = useMemo(() => {
    if (!selectedEvent || !email) return null;

    for (const order of orders) {
      if (order.event?.id === selectedEvent.id && order.status === 'completed') {
        // Find attendee matching email
        const attendee = order.attendees.find(
          a => a.attendee_email?.toLowerCase() === email?.toLowerCase()
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
  }, [selectedEvent, orders, email]);

  // Set selected event ID
  const setSelectedEventId = useCallback((eventId: string) => {
    setSelectedEventIdState(eventId);
    localStorage.setItem(SELECTED_EVENT_KEY, eventId);
  }, []);

  // Auto-select first event when available
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId, setSelectedEventId]);

  const value: AttendeeEventContextType = {
    events,
    selectedEvent,
    selectedAttendee,
    setSelectedEventId,
  };

  return (
    <AttendeeEventContext.Provider value={value}>
      {children}
    </AttendeeEventContext.Provider>
  );
}

export function useAttendeeEvent() {
  const context = useContext(AttendeeEventContext);
  if (context === undefined) {
    throw new Error('useAttendeeEvent must be used within an AttendeeEventProvider');
  }
  return context;
}
