
# Fix Messages Tab Intermittent Empty State

## Problem

The Messages tab sometimes shows "Start connecting!" (empty state) even when conversations exist. This is a race condition caused by multiple independent hook instances and transient null context values.

## Root Cause

Three issues work together to cause this bug:

1. **Multiple Hook Instances**: `useConversations` is called independently in 3 places (Messages page, Conversation page, BottomNavigation), each with its own state that starts empty

2. **Data Clearing on Null Dependencies**: When any context value (`email`, `sessionToken`, `selectedAttendee`, `selectedEvent`) is momentarily null during re-renders, the hook clears conversations to an empty array

3. **Realtime Subscription Churn**: The subscription effect depends on the full `conversations` array, causing re-subscriptions on every fetch

## Solution

Lift conversation state into `AttendeeContext` so all components share a single source of truth, and fix the data-clearing behavior.

---

## Implementation

### 1. Move Conversations to AttendeeContext

**File: `src/contexts/AttendeeContext.tsx`**

Add conversation state and fetch logic to the context:

- Add state: `conversations`, `conversationsLoading`, `conversationsError`
- Add `fetchConversations` callback that uses the already-available `email`, session token, `selectedAttendee`, and `selectedEvent`
- Add realtime subscription for new messages within the context
- Export `conversations`, `totalUnread`, `refreshConversations`, and `conversationsLoading`

Key change - prevent clearing on transient nulls:
```tsx
const fetchConversations = useCallback(async () => {
  // Don't clear existing data - just skip fetch if not ready
  if (!orderPortal.email || !selectedAttendee || !selectedEvent) {
    return; // Keep existing conversations instead of clearing
  }
  
  const sessionToken = getSessionToken();
  if (!sessionToken) return;

  setConversationsLoading(true);
  // ... fetch logic
}, [orderPortal.email, selectedAttendee, selectedEvent, getSessionToken]);
```

### 2. Update useConversations Hook

**File: `src/hooks/useConversations.ts`**

Convert to a thin wrapper that reads from context:

```tsx
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
```

This ensures all callers (Messages, Conversation, BottomNavigation) share the same data.

### 3. Fix Realtime Subscription

In the context, use stable dependencies for the subscription:

```tsx
// Store conversation IDs in a ref to avoid re-subscription on every fetch
const conversationIdsRef = useRef<string[]>([]);

useEffect(() => {
  conversationIdsRef.current = conversations.map(c => c.id);
}, [conversations]);

useEffect(() => {
  if (!selectedAttendee || !selectedEvent) return;

  const channel = supabase
    .channel(`conversations-${selectedAttendee.id}`)
    .on('postgres_changes', { ... }, (payload) => {
      if (conversationIdsRef.current.includes(payload.new?.conversation_id)) {
        fetchConversations();
      }
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [selectedAttendee?.id, selectedEvent?.id, fetchConversations]);
// Note: conversations removed from deps - uses ref instead
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/AttendeeContext.tsx` | Add conversations state, fetch logic, and realtime subscription |
| `src/hooks/useConversations.ts` | Convert to thin context wrapper |

---

## Technical Notes

### Why This Fixes the Issue

| Current Problem | Solution |
|-----------------|----------|
| 3 hook instances with independent state | Single state in context, shared by all |
| `setConversations([])` on null deps | Skip fetch instead of clearing data |
| Subscription depends on conversations array | Use ref for stable dependency |

### Behavioral Change

- Conversations are fetched once when `selectedAttendee` changes, then shared
- Navigating between tabs doesn't trigger new fetches or show loading states
- Realtime updates still work but don't cause subscription churn

### Migration Safety

The `useConversations` hook keeps its existing API, so `Messages.tsx`, `Conversation.tsx`, and `BottomNavigation.tsx` don't need changes.
