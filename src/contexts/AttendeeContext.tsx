// Re-export providers and hooks for backward compatibility
export { AttendeeProviders as AttendeeProvider } from './AttendeeProviders';
export { useAttendeeAuth, type PortalOrder } from './AttendeeAuthContext';
export { useAttendeeEvent, type AttendeeEvent, type AttendeeInfo } from './AttendeeEventContext';
export { useBookmarks, type Bookmark } from './BookmarksContext';
export { useConversationsContext, type Conversation, type ConversationParticipant, type LastMessage } from './ConversationsContext';

// Import hooks to build compatibility layer
import { useAttendeeAuth } from './AttendeeAuthContext';
import { useAttendeeEvent } from './AttendeeEventContext';
import { useBookmarks } from './BookmarksContext';
import { useConversationsContext } from './ConversationsContext';

/**
 * Compatibility hook - combines all contexts into the original useAttendee shape.
 * Existing components that use useAttendee() will continue to work without changes.
 * Over time, components can be migrated to use the more specific hooks instead.
 */
export function useAttendee() {
  const auth = useAttendeeAuth();
  const event = useAttendeeEvent();
  const bookmarks = useBookmarks();
  const conversations = useConversationsContext();

  return {
    // Auth
    isAuthenticated: auth.isAuthenticated,
    email: auth.email,
    loading: auth.loading || bookmarks.loading,
    error: auth.error,
    sendMagicLink: auth.sendMagicLink,
    logout: auth.logout,
    orders: auth.orders,

    // Event selection
    events: event.events,
    selectedEvent: event.selectedEvent,
    selectedAttendee: event.selectedAttendee,
    setSelectedEventId: event.setSelectedEventId,

    // Bookmarks
    bookmarks: bookmarks.bookmarks,
    bookmarkedItemIds: bookmarks.bookmarkedItemIds,
    toggleBookmark: bookmarks.toggleBookmark,
    refreshBookmarks: bookmarks.refreshBookmarks,

    // Conversations
    conversations: conversations.conversations,
    conversationsLoading: conversations.conversationsLoading,
    conversationsError: conversations.conversationsError,
    refreshConversations: conversations.refreshConversations,
    totalUnread: conversations.totalUnread,
    messagesCache: conversations.messagesCache,
    getCachedMessages: conversations.getCachedMessages,
    setCachedMessages: conversations.setCachedMessages,
    prefetchMessages: conversations.prefetchMessages,
  };
}
