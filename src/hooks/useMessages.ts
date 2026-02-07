import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAttendee } from '@/contexts/AttendeeContext';

export interface MessageSender {
  type: 'attendee' | 'speaker';
  id: string;
  name: string;
  avatar_url?: string;
  title?: string;
  company?: string;
}

export interface ReplyTo {
  id: string;
  content: string;
  sender_name: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  reply_to_id?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender: MessageSender;
  reply_to?: ReplyTo;
  is_own: boolean;
  status?: 'sending' | 'sent' | 'failed';
  reactions?: MessageReaction[];
}

export function useMessages(conversationId: string | null) {
  const { email, sessionToken, selectedAttendee } = useAttendee();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async (before?: string) => {
    if (!email || !sessionToken || !selectedAttendee || !conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    if (!before) setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-conversation-messages', {
        body: {
          email,
          session_token: sessionToken,
          attendee_id: selectedAttendee.id,
          conversation_id: conversationId,
          before,
          limit: 50
        }
      });

      if (fetchError) throw fetchError;
      if (data?.error) throw new Error(data.error);

      if (before) {
        setMessages(prev => [...(data?.messages || []), ...prev]);
      } else {
        setMessages(data?.messages || []);
      }
      setHasMore(data?.has_more || false);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [email, sessionToken, selectedAttendee, conversationId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!conversationId || !selectedAttendee) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendee_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Don't add if it's from ourselves (already added optimistically)
          const newMsg = payload.new as any;
          if (newMsg.sender_attendee_id === selectedAttendee.id) {
            return;
          }

          // Fetch the enriched message
          const { data } = await supabase.functions.invoke('get-conversation-messages', {
            body: {
              email,
              session_token: sessionToken,
              attendee_id: selectedAttendee.id,
              conversation_id: conversationId,
              limit: 1
            }
          });

          if (data?.messages?.[0]) {
            setMessages(prev => {
              // Check if message already exists
              if (prev.some(m => m.id === data.messages[0].id)) {
                return prev;
              }
              return [...prev, data.messages[0]];
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, selectedAttendee?.id, email, sessionToken]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!email || !sessionToken || !selectedAttendee || !conversationId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create optimistic message with temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      content,
      reply_to_id: replyToId,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: {
        type: 'attendee',
        id: selectedAttendee.id,
        name: selectedAttendee.attendee_name || 'You',
        avatar_url: undefined,
      },
      is_own: true,
      status: 'sending',
    };

    // Add to list immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setSending(true);

    try {
      const { data, error: sendError } = await supabase.functions.invoke('send-attendee-message', {
        body: {
          email,
          session_token: sessionToken,
          attendee_id: selectedAttendee.id,
          conversation_id: conversationId,
          content,
          reply_to_id: replyToId
        }
      });

      if (sendError) throw sendError;
      if (data?.error) throw new Error(data.error);

      // Replace temp message with real one
      if (data?.message) {
        setMessages(prev => prev.map(m => 
          m.id === tempId 
            ? { ...data.message, status: 'sent' as const }
            : m
        ));
      }

      return { success: true };
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Mark as failed
      setMessages(prev => prev.map(m => 
        m.id === tempId 
          ? { ...m, status: 'failed' as const }
          : m
      ));
      return { success: false, error: err.message };
    } finally {
      setSending(false);
    }
  }, [email, sessionToken, selectedAttendee, conversationId]);

  const loadMore = useCallback(() => {
    if (messages.length > 0 && hasMore) {
      fetchMessages(messages[0].created_at);
    }
  }, [messages, hasMore, fetchMessages]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!email || !sessionToken || !selectedAttendee || !conversationId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Optimistic update
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      
      const reactions = [...(msg.reactions || [])];
      const existingIndex = reactions.findIndex(r => r.emoji === emoji);
      
      if (existingIndex >= 0) {
        const existing = reactions[existingIndex];
        if (existing.reacted) {
          // Remove our reaction
          if (existing.count === 1) {
            reactions.splice(existingIndex, 1);
          } else {
            reactions[existingIndex] = { ...existing, count: existing.count - 1, reacted: false };
          }
        } else {
          // Add our reaction
          reactions[existingIndex] = { ...existing, count: existing.count + 1, reacted: true };
        }
      } else {
        // New reaction
        reactions.push({ emoji, count: 1, reacted: true });
      }
      
      return { ...msg, reactions };
    }));

    try {
      const { data, error: toggleError } = await supabase.functions.invoke('toggle-message-reaction', {
        body: {
          email,
          session_token: sessionToken,
          attendee_id: selectedAttendee.id,
          message_id: messageId,
          emoji
        }
      });

      if (toggleError) throw toggleError;
      if (data?.error) throw new Error(data.error);

      // Update with server response
      if (data?.reactions) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, reactions: data.reactions } : msg
        ));
      }

      return { success: true };
    } catch (err: any) {
      console.error('Failed to toggle reaction:', err);
      // Revert optimistic update by refetching
      fetchMessages();
      return { success: false, error: err.message };
    }
  }, [email, sessionToken, selectedAttendee, conversationId, fetchMessages]);

  return {
    messages,
    loading,
    error,
    sending,
    hasMore,
    sendMessage,
    loadMore,
    toggleReaction,
    refetch: fetchMessages
  };
}
