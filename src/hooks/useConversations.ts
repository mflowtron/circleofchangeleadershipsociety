import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAttendee } from '@/contexts/AttendeeContext';

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

export function useConversations() {
  const { email, sessionToken, selectedAttendee, selectedEvent } = useAttendee();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!email || !sessionToken || !selectedAttendee || !selectedEvent) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-attendee-conversations', {
        body: {
          email,
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [email, sessionToken, selectedAttendee, selectedEvent]);

  // Set up realtime subscription for new messages - scoped to user's conversations
  useEffect(() => {
    if (!selectedAttendee || !selectedEvent || conversations.length === 0) return;

    // Get conversation IDs this user is part of
    const userConversationIds = conversations.map(c => c.id);

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
          if (userConversationIds.includes(payload.new?.conversation_id)) {
            fetchConversations();
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
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAttendee?.id, selectedEvent?.id, conversations, fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    totalUnread
  };
}
