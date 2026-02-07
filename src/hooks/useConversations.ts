import { useAttendee, Conversation, ConversationParticipant, LastMessage } from '@/contexts/AttendeeContext';

// Re-export types for consumers
export type { Conversation, ConversationParticipant, LastMessage };

/**
 * Hook to access conversations from AttendeeContext.
 * This ensures all components share the same conversation state,
 * preventing race conditions from multiple independent hook instances.
 */
export function useConversations() {
  const { 
    conversations, 
    conversationsLoading, 
    conversationsError,
    refreshConversations,
    totalUnread 
  } = useAttendee();

  return {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    refetch: refreshConversations,
    totalUnread
  };
}
