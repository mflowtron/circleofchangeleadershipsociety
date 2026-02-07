

# Refactor AttendeeContext into Four Focused Providers

## Summary

Split the monolithic `AttendeeContext.tsx` (436 lines) into four single-responsibility context providers. This improves performance by isolating re-renders, makes each provider independently understandable, and prepares for future scaling.

---

## New Files to Create

| File | Responsibility | Dependencies |
|------|----------------|--------------|
| `src/contexts/AttendeeAuthContext.tsx` | Auth state from useOrderPortal | None |
| `src/contexts/AttendeeEventContext.tsx` | Event/attendee selection | AttendeeAuthContext |
| `src/contexts/BookmarksContext.tsx` | Bookmark state + toggle | AttendeeAuthContext, AttendeeEventContext |
| `src/contexts/ConversationsContext.tsx` | Conversations, realtime, message cache | AttendeeAuthContext, AttendeeEventContext |
| `src/contexts/AttendeeProviders.tsx` | Nesting wrapper | All four providers |

---

## Provider Dependency Chain

```text
AttendeeAuthProvider
  └─ AttendeeEventProvider
       ├─ BookmarksProvider
       └─ ConversationsProvider
              └─ {children}
```

---

## File 1: `src/contexts/AttendeeAuthContext.tsx`

### Interface

```typescript
interface AttendeeAuthContextType {
  isAuthenticated: boolean;
  email: string | null;
  loading: boolean;
  error: string | null;
  sendMagicLink: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  orders: PortalOrder[];
}
```

### Code to Move

- Import and use `useOrderPortal` hook
- Expose `isAuthenticated`, `email`, `loading`, `error`, `sendMagicLink`, `logout`, `orders` from the hook

### Exports

- `AttendeeAuthProvider`
- `useAttendeeAuth`
- Re-export `PortalOrder` type from useOrderPortal

---

## File 2: `src/contexts/AttendeeEventContext.tsx`

### Interface

```typescript
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

interface AttendeeEventContextType {
  events: AttendeeEvent[];
  selectedEvent: AttendeeEvent | null;
  selectedAttendee: AttendeeInfo | null;
  setSelectedEventId: (eventId: string) => void;
}
```

### Code to Move

- `SELECTED_EVENT_KEY` constant
- `AttendeeEvent` and `AttendeeInfo` interfaces
- `selectedEventId` state with localStorage initialization (lines 114-116)
- `events` memo that extracts unique events from orders (lines 133-141)
- `selectedEvent` memo (lines 144-147)
- `selectedAttendee` memo (lines 150-172)
- `setSelectedEventId` callback (lines 175-178)
- Auto-select first event `useEffect` (lines 258-262)

### Dependencies

- Uses `useAttendeeAuth()` to access `orders` and `email`

### Exports

- `AttendeeEventProvider`
- `useAttendeeEvent`
- Export `AttendeeEvent` and `AttendeeInfo` types

---

## File 3: `src/contexts/BookmarksContext.tsx`

### Interface

```typescript
interface Bookmark {
  id: string;
  attendee_id: string;
  agenda_item_id: string;
  created_at: string;
}

interface BookmarksContextType {
  bookmarks: Bookmark[];
  bookmarkedItemIds: Set<string>;
  toggleBookmark: (agendaItemId: string) => Promise<{ success: boolean }>;
  refreshBookmarks: () => Promise<void>;
  loading: boolean;
}
```

### Code to Move

- `Bookmark` interface (lines 62-67)
- `bookmarks` and `bookmarksLoading` state (lines 119-120)
- `refreshBookmarks` callback (lines 181-200)
- `toggleBookmark` callback with optimistic update (lines 203-243)
- `bookmarkedItemIds` memo (lines 246-248)
- Fetch bookmarks `useEffect` (lines 251-255)

### Dependencies

- Uses `useAttendeeAuth()` for `isAuthenticated`
- Uses `useAttendeeEvent()` for `selectedAttendee`

### Exports

- `BookmarksProvider`
- `useBookmarks`
- Export `Bookmark` type

---

## File 4: `src/contexts/ConversationsContext.tsx`

### Interface

```typescript
// Already exported from current AttendeeContext
interface ConversationParticipant { ... }
interface LastMessage { ... }
interface Conversation { ... }

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
```

### Code to Move

- `ConversationParticipant`, `LastMessage`, `Conversation` interfaces (lines 9-40)
- `conversations`, `conversationsLoading`, `conversationsError` state (lines 123-125)
- `conversationIdsRef` ref (line 126)
- `messagesCacheRef` and `prefetchingRef` refs (lines 129-130)
- `refreshConversations` callback (lines 268-298)
- Keep conversation IDs ref in sync `useEffect` (lines 301-303)
- Realtime subscription `useEffect` (lines 306-344)
- Fetch conversations `useEffect` (lines 347-351)
- `totalUnread` memo (lines 354-356)
- `getCachedMessages`, `setCachedMessages`, `prefetchMessages` callbacks (lines 359-394)

### Dependencies

- Uses `useAttendeeAuth()` for `isAuthenticated`
- Uses `useAttendeeEvent()` for `selectedAttendee` and `selectedEvent`
- Imports `supabase` from `@/integrations/supabase/client`
- Imports `Message` type from `@/hooks/useMessages`

### Exports

- `ConversationsProvider`
- `useConversations`
- Export `Conversation`, `ConversationParticipant`, `LastMessage` types

---

## File 5: `src/contexts/AttendeeProviders.tsx`

### Implementation

```typescript
import { ReactNode } from 'react';
import { AttendeeAuthProvider } from './AttendeeAuthContext';
import { AttendeeEventProvider } from './AttendeeEventContext';
import { BookmarksProvider } from './BookmarksContext';
import { ConversationsProvider } from './ConversationsContext';

export function AttendeeProviders({ children }: { children: ReactNode }) {
  return (
    <AttendeeAuthProvider>
      <AttendeeEventProvider>
        <BookmarksProvider>
          <ConversationsProvider>
            {children}
          </ConversationsProvider>
        </BookmarksProvider>
      </AttendeeEventProvider>
    </AttendeeAuthProvider>
  );
}
```

---

## File 6: Replace `src/contexts/AttendeeContext.tsx`

Replace the entire file with a thin compatibility layer:

```typescript
// Re-export providers and hooks
export { AttendeeProviders as AttendeeProvider } from './AttendeeProviders';
export { useAttendeeAuth } from './AttendeeAuthContext';
export { useAttendeeEvent, type AttendeeEvent, type AttendeeInfo } from './AttendeeEventContext';
export { useBookmarks, type Bookmark } from './BookmarksContext';
export { useConversations, type Conversation, type ConversationParticipant, type LastMessage } from './ConversationsContext';

// Re-export PortalOrder from useOrderPortal (unchanged)
export type { PortalOrder } from '@/hooks/useOrderPortal';

// Compatibility hook - combines all contexts
export function useAttendee() {
  const auth = useAttendeeAuth();
  const event = useAttendeeEvent();
  const bookmarks = useBookmarks();
  const conversations = useConversations();

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
```

---

## Update Existing Hooks

### `src/hooks/useConversations.ts`

Change import to use new dedicated context:

```typescript
// Before
import { useAttendee, Conversation, ConversationParticipant, LastMessage } from '@/contexts/AttendeeContext';

// After
import { useConversations as useConversationsContext, Conversation, ConversationParticipant, LastMessage } from '@/contexts/ConversationsContext';
```

Or keep it importing from `AttendeeContext.tsx` since the compatibility layer re-exports these types.

### `src/hooks/useAttendeeBookmarks.ts`

Keep importing from `@/contexts/AttendeeContext` - compatibility hook provides same interface.

---

## Files That Import from AttendeeContext (16 files)

All 16 files continue to work without changes because:

1. `AttendeeProvider` export is aliased from `AttendeeProviders`
2. `useAttendee()` hook returns the combined shape
3. All types (`Conversation`, `ConversationParticipant`, `LastMessage`) are re-exported

| File | Current Import | Status |
|------|----------------|--------|
| `src/pages/attendee/Dashboard.tsx` | `useAttendee, AttendeeProvider` | Works (compatibility layer) |
| `src/hooks/useConversations.ts` | `useAttendee, Conversation, ...` | Works (types re-exported) |
| `src/hooks/useMessages.ts` | `useAttendee` | Works (compatibility hook) |
| `src/hooks/useAttendeeBookmarks.ts` | `useAttendee` | Works (compatibility hook) |
| `src/hooks/useAttendeeProfile.ts` | `useAttendee` | Works (compatibility hook) |
| `src/hooks/useNetworking.ts` | `useAttendee` | Works (compatibility hook) |
| All other components | `useAttendee` | Works (compatibility hook) |

---

## Summary

| Action | Count |
|--------|-------|
| New files | 5 |
| Modified files | 1 (AttendeeContext.tsx becomes compatibility layer) |
| Deleted files | 0 |
| Lines moved | ~320 |
| Components requiring changes | 0 |

### Benefits

- **Isolated re-renders**: Bookmark changes don't trigger conversation re-renders
- **Clearer ownership**: Each provider has single responsibility
- **Easier testing**: Can test providers independently
- **Future-proof**: Components can gradually migrate to specific hooks

