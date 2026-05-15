import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAttendee } from '@/contexts/AttendeeContext';
import { fileToBase64 } from '@/lib/fileUtils';

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

export interface MessageAttachment {
  url: string;
  type: string;
  name: string;
  size: number;
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
  attachment?: MessageAttachment;
}

interface MessagesQueryData {
  messages: Message[];
  hasMore: boolean;
}

export function useMessages(conversationId: string | null) {
  const { isAuthenticated, selectedAttendee, getCachedMessages, setCachedMessages } = useAttendee();
  const queryClient = useQueryClient();

  // Main query for fetching messages
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<MessagesQueryData> => {
      if (!isAuthenticated || !selectedAttendee || !conversationId) {
        return { messages: [], hasMore: false };
      }

      const { data, error: fetchError } = await supabase.functions.invoke('get-conversation-messages', {
        body: {
          attendee_id: selectedAttendee.id,
          conversation_id: conversationId,
          limit: 50
        }
      });

      if (fetchError) throw fetchError;
      if (data?.error) throw new Error(data.error);

      const messages = data?.messages || [];
      
      // Update context cache for prefetch feature
      setCachedMessages(conversationId, messages);

      return {
        messages,
        hasMore: data?.has_more || false,
      };
    },
    enabled: !!conversationId && isAuthenticated && !!selectedAttendee,
    placeholderData: () => {
      if (!conversationId) return undefined;
      const cached = getCachedMessages(conversationId);
      if (cached && cached.length > 0) {
        return { messages: cached, hasMore: false };
      }
      return undefined;
    },
    refetchInterval: 5000,
  });

  const messages = data?.messages || [];
  const hasMore = data?.hasMore || false;
  const error = queryError?.message || null;

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, replyToId }: { content: string; replyToId?: string }) => {
      if (!isAuthenticated || !selectedAttendee || !conversationId) {
        throw new Error('Not authenticated');
      }

      const { data, error: sendError } = await supabase.functions.invoke('send-attendee-message', {
        body: {
          attendee_id: selectedAttendee.id,
          conversation_id: conversationId,
          content,
          reply_to_id: replyToId
        }
      });

      if (sendError) throw sendError;
      if (data?.error) throw new Error(data.error);

      return data?.message;
    },
    onMutate: async ({ content, replyToId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });

      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId!,
        content,
        reply_to_id: replyToId,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: {
          type: 'attendee',
          id: selectedAttendee!.id,
          name: selectedAttendee!.attendee_name || 'You',
          avatar_url: undefined,
        },
        is_own: true,
        status: 'sending',
      };

      // Add optimistic message
      queryClient.setQueryData<MessagesQueryData>(
        ['messages', conversationId],
        (old) => ({
          messages: [...(old?.messages || []), optimisticMessage],
          hasMore: old?.hasMore || false,
        })
      );

      return { tempId };
    },
    onSuccess: (serverMessage, _variables, context) => {
      // Replace temp with real message
      if (serverMessage && context?.tempId) {
        queryClient.setQueryData<MessagesQueryData>(
          ['messages', conversationId],
          (old) => ({
            messages: old?.messages.map(m =>
              m.id === context.tempId ? { ...serverMessage, status: 'sent' as const } : m
            ) || [],
            hasMore: old?.hasMore || false,
          })
        );
      }
    },
    onError: (_error, _variables, context) => {
      // Mark as failed
      if (context?.tempId) {
        queryClient.setQueryData<MessagesQueryData>(
          ['messages', conversationId],
          (old) => ({
            messages: old?.messages.map(m =>
              m.id === context.tempId ? { ...m, status: 'failed' as const } : m
            ) || [],
            hasMore: old?.hasMore || false,
          })
        );
      }
    },
  });

  // Send message with attachment mutation
  const sendMessageWithAttachmentMutation = useMutation({
    mutationFn: async ({ content, file }: { content: string; file: File }) => {
      if (!isAuthenticated || !selectedAttendee || !conversationId) {
        throw new Error('Not authenticated');
      }

      // 1. Upload file to storage via edge function
      const base64File = await fileToBase64(file);
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-chat-attachment', {
        body: {
          attendee_id: selectedAttendee.id,
          conversation_id: conversationId,
          file: base64File,
          filename: file.name,
          content_type: file.type
        }
      });

      if (uploadError) throw uploadError;
      if (uploadData?.error) throw new Error(uploadData.error);

      // 2. Send message with attachment metadata
      const { data, error: sendError } = await supabase.functions.invoke('send-attendee-message', {
        body: {
          attendee_id: selectedAttendee.id,
          conversation_id: conversationId,
          content: content || '',
          attachment_url: uploadData.url,
          attachment_type: file.type,
          attachment_name: file.name,
          attachment_size: uploadData.size || file.size
        }
      });

      if (sendError) throw sendError;
      if (data?.error) throw new Error(data.error);

      return data?.message;
    },
    onMutate: async ({ content, file }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });

      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId!,
        content,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: {
          type: 'attendee',
          id: selectedAttendee!.id,
          name: selectedAttendee!.attendee_name || 'You',
          avatar_url: undefined,
        },
        is_own: true,
        status: 'sending',
        attachment: {
          url: URL.createObjectURL(file),
          type: file.type,
          name: file.name,
          size: file.size
        }
      };

      queryClient.setQueryData<MessagesQueryData>(
        ['messages', conversationId],
        (old) => ({
          messages: [...(old?.messages || []), optimisticMessage],
          hasMore: old?.hasMore || false,
        })
      );

      return { tempId };
    },
    onSuccess: (serverMessage, _variables, context) => {
      if (serverMessage && context?.tempId) {
        queryClient.setQueryData<MessagesQueryData>(
          ['messages', conversationId],
          (old) => ({
            messages: old?.messages.map(m =>
              m.id === context.tempId ? { ...serverMessage, status: 'sent' as const } : m
            ) || [],
            hasMore: old?.hasMore || false,
          })
        );
      }
    },
    onError: (_error, _variables, context) => {
      if (context?.tempId) {
        queryClient.setQueryData<MessagesQueryData>(
          ['messages', conversationId],
          (old) => ({
            messages: old?.messages.map(m =>
              m.id === context.tempId ? { ...m, status: 'failed' as const } : m
            ) || [],
            hasMore: old?.hasMore || false,
          })
        );
      }
    },
  });

  // Toggle reaction mutation
  const toggleReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!isAuthenticated || !selectedAttendee) {
        throw new Error('Not authenticated');
      }

      const { data, error: toggleError } = await supabase.functions.invoke('toggle-message-reaction', {
        body: {
          attendee_id: selectedAttendee.id,
          message_id: messageId,
          emoji
        }
      });

      if (toggleError) throw toggleError;
      if (data?.error) throw new Error(data.error);

      return data?.reactions;
    },
    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });

      const previousData = queryClient.getQueryData<MessagesQueryData>(['messages', conversationId]);

      // Optimistic update
      queryClient.setQueryData<MessagesQueryData>(
        ['messages', conversationId],
        (old) => ({
          messages: old?.messages.map(msg => {
            if (msg.id !== messageId) return msg;
            
            const reactions = [...(msg.reactions || [])];
            const existingIndex = reactions.findIndex(r => r.emoji === emoji);
            
            if (existingIndex >= 0) {
              const existing = reactions[existingIndex];
              if (existing.reacted) {
                if (existing.count === 1) {
                  reactions.splice(existingIndex, 1);
                } else {
                  reactions[existingIndex] = { ...existing, count: existing.count - 1, reacted: false };
                }
              } else {
                reactions[existingIndex] = { ...existing, count: existing.count + 1, reacted: true };
              }
            } else {
              reactions.push({ emoji, count: 1, reacted: true });
            }
            
            return { ...msg, reactions };
          }) || [],
          hasMore: old?.hasMore || false,
        })
      );

      return { previousData };
    },
    onSuccess: (serverReactions, { messageId }) => {
      if (serverReactions) {
        queryClient.setQueryData<MessagesQueryData>(
          ['messages', conversationId],
          (old) => ({
            messages: old?.messages.map(msg =>
              msg.id === messageId ? { ...msg, reactions: serverReactions } : msg
            ) || [],
            hasMore: old?.hasMore || false,
          })
        );
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['messages', conversationId], context.previousData);
      }
    },
  });

  // Load more function (for pagination)
  const loadMore = useCallback(async () => {
    if (!isAuthenticated || !selectedAttendee || !conversationId || messages.length === 0 || !hasMore) {
      return;
    }

    const { data, error: fetchError } = await supabase.functions.invoke('get-conversation-messages', {
      body: {
        attendee_id: selectedAttendee.id,
        conversation_id: conversationId,
        before: messages[0].created_at,
        limit: 50
      }
    });

    if (fetchError || data?.error) {
      console.error('Failed to load more messages:', fetchError || data?.error);
      return;
    }

    const olderMessages = data?.messages || [];
    
    queryClient.setQueryData<MessagesQueryData>(
      ['messages', conversationId],
      (old) => ({
        messages: [...olderMessages, ...(old?.messages || [])],
        hasMore: data?.has_more || false,
      })
    );
  }, [isAuthenticated, selectedAttendee, conversationId, messages, hasMore, queryClient]);

  // Get reactors function
  const getReactors = useCallback(async (messageId: string, emoji: string) => {
    if (!isAuthenticated || !selectedAttendee) {
      throw new Error('Not authenticated');
    }

    const { data, error: fetchError } = await supabase.functions.invoke('get-message-reactors', {
      body: {
        attendee_id: selectedAttendee.id,
        message_id: messageId,
        emoji
      }
    });

    if (fetchError) throw fetchError;
    if (data?.error) throw new Error(data.error);

    return data?.reactors || [];
  }, [isAuthenticated, selectedAttendee]);

  // Wrapper functions to maintain the same API
  const sendMessage = async (content: string, replyToId?: string) => {
    try {
      await sendMessageMutation.mutateAsync({ content, replyToId });
      return { success: true };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to send message:', error);
      return { success: false, error: error.message };
    }
  };

  const sendMessageWithAttachment = async (content: string, file: File) => {
    try {
      await sendMessageWithAttachmentMutation.mutateAsync({ content, file });
      return { success: true };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to send message with attachment:', error);
      return { success: false, error: error.message };
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleReactionMutation.mutateAsync({ messageId, emoji });
      return { success: true };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to toggle reaction:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    messages,
    loading,
    error,
    sending: sendMessageMutation.isPending || sendMessageWithAttachmentMutation.isPending,
    hasMore,
    sendMessage,
    sendMessageWithAttachment,
    loadMore,
    toggleReaction,
    getReactors,
    refetch,
  };
}
