import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAttendeeAuth } from './AttendeeAuthContext';
import { useAttendeeEvent } from './AttendeeEventContext';
import type { Message } from '@/hooks/useMessages';

// Conversation types
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

interface ConversationsContextType {
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  refreshConversations: (options?: { silent?: boolean }) => Promise<void>;
  totalUnread: number;
  messagesCache: Map<string, Message[]>;
  getCachedMessages: (conversationId: string) => Message[] | undefined;
  setCachedMessages: (conversationId: string, messages: Message[]) => void;
  prefetchMessages: (conversationId: string) => void;
}

const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAttendeeAuth();
  const { selectedAttendee, selectedEvent } = useAttendeeEvent();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const conversationIdsRef = useRef<string[]>([]);

  // Message cache for stale-while-revalidate pattern
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const prefetchingRef = useRef<Set<string>>(new Set());

  // Fetch conversations (doesn't clear on transient null deps)
  // options.silent = true means background refresh (no loading indicator)
  const refreshConversations = useCallback(async (options?: { silent?: boolean }) => {
    // Don't clear existing data - just skip fetch if not ready
    if (!isAuthenticated || !selectedAttendee || !selectedEvent) {
      return;
    }

    // Only show loading indicator if NOT a silent background refresh
    if (!options?.silent) {
      setConversationsLoading(true);
    }
    setConversationsError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-attendee-conversations', {
        body: {
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
  }, [isAuthenticated, selectedAttendee, selectedEvent]);

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
          // Use silent refresh to avoid loading spinners
          if (conversationIdsRef.current.includes(payload.new?.conversation_id)) {
            refreshConversations({ silent: true });
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
          // Refresh when participant status changes (silent to avoid loading)
          refreshConversations({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAttendee?.id, selectedEvent?.id, refreshConversations]);

  // Fetch conversations when attendee changes
  useEffect(() => {
    if (selectedAttendee && selectedEvent && isAuthenticated) {
      refreshConversations();
    }
  }, [selectedAttendee?.id, selectedEvent?.id, isAuthenticated]);

  // Calculate total unread
  const totalUnread = useMemo(() => {
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
    if (!isAuthenticated || !selectedAttendee) return;

    prefetchingRef.current.add(conversationId);

    try {
      const { data, error } = await supabase.functions.invoke('get-conversation-messages', {
        body: {
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
  }, [isAuthenticated, selectedAttendee]);

  const value: ConversationsContextType = {
    conversations,
    conversationsLoading,
    conversationsError,
    refreshConversations,
    totalUnread,
    messagesCache: messagesCacheRef.current,
    getCachedMessages,
    setCachedMessages,
    prefetchMessages,
  };

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversationsContext() {
  const context = useContext(ConversationsContext);
  if (context === undefined) {
    throw new Error('useConversationsContext must be used within a ConversationsProvider');
  }
  return context;
}
