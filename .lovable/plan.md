

# Fix Messages Feature - Reload Loop and Blank Page

## Problem Summary

After the recent update, the Conversation page has critical UX issues:
1. **Page goes blank** after the slide transition completes
2. **Loading skeletons appear** instead of keeping existing content visible  
3. **Page reloads every few seconds** in a loop
4. **Header shows loading state** when it should remain stable

## Root Cause Analysis

### Issue 1: Conditional Full-Page Loading Return (Lines 119-138 in Conversation.tsx)

```tsx
if (convsLoading && !conversation) {
  return (
    <div>... skeleton page ...</div>  // <-- Replaces ENTIRE page
  );
}
```

When `convsLoading` is true and `conversation` is null (before the lookup effect runs), the entire page including the header is replaced with skeletons. Since conversations refetch frequently (realtime triggers), this causes:
- Page to go blank
- Header to disappear
- Slide animation to restart

### Issue 2: Cascading Loading State in AttendeeContext (Line 435)

```tsx
loading: orderPortal.loading || bookmarksLoading || conversationsLoading,
```

The `loading` in context combines ALL loading states. So when `conversationsLoading` is true (happens on realtime updates), the entire attendee app thinks it's loading.

### Issue 3: Realtime Subscription Triggers Full Refetch

In `AttendeeContext.tsx` lines 338-375, the realtime subscription calls `refreshConversations()` on every new message. This sets `conversationsLoading = true`, which cascades through:
1. Context loading becomes true
2. `useConversations` returns `loading: true`
3. `Conversation.tsx` shows full-page skeleton
4. Animation restarts

### Issue 4: useMessages Fetch Effect Has Unstable Dependencies (Lines 178-186)

```tsx
useEffect(() => {
  if (conversationId && !hasFetchedRef.current) {
    hasFetchedRef.current = true;
    fetchMessages();
  }
  return () => {
    hasFetchedRef.current = false;  // <-- Resets on EVERY cleanup
  };
}, [conversationId, fetchMessages]);
```

The `fetchMessages` callback changes on every render because it depends on `getCachedMessages` and `setCachedMessages`, causing the effect to re-run repeatedly.

---

## Solution

### Fix 1: Never Show Full-Page Skeleton When Conversation Exists

Change the loading guard in `Conversation.tsx` to:
1. Only show skeleton on **initial** load when no conversation data exists
2. Keep header and existing messages visible during background refreshes
3. Use a `conversation` fallback from conversations array immediately

```tsx
// Get conversation immediately from context (before effect runs)
const conversation = conversations.find(c => c.id === conversationId) || null;

// Only show skeleton if we have NO data at all
if (!conversation && convsLoading) {
  return <FullPageSkeleton />;
}
```

### Fix 2: Separate Loading States in Context

Don't combine `conversationsLoading` into the main `loading` state:

```tsx
// Before
loading: orderPortal.loading || bookmarksLoading || conversationsLoading,

// After
loading: orderPortal.loading || bookmarksLoading,
// Expose conversationsLoading separately (already done)
```

### Fix 3: Add "Background Refresh" Mode to Conversations

The realtime subscription should NOT set `conversationsLoading = true` when refreshing:

```tsx
const refreshConversations = useCallback(async (options?: { silent?: boolean }) => {
  // Only set loading if NOT silent (i.e., user-initiated)
  if (!options?.silent) {
    setConversationsLoading(true);
  }
  // ... fetch ...
}, []);

// In realtime handler:
refreshConversations({ silent: true }); // Background refresh
```

### Fix 4: Stabilize useMessages Dependencies

Memoize `getCachedMessages` and `setCachedMessages` to prevent callback churn:

```tsx
// Already correct with useCallback, but ensure ref-based pattern
// Remove getCachedMessages/setCachedMessages from fetchMessages deps
```

### Fix 5: Header Always Visible

Ensure the header (back button, title, menu) renders even during loading:
- Move conversation lookup BEFORE the loading check
- Use cached conversation name if available
- Show "Loading..." as title only if conversation is truly unknown

---

## Implementation Details

### File: `src/contexts/AttendeeContext.tsx`

1. **Add silent refresh option** to `refreshConversations`:

```tsx
const refreshConversations = useCallback(async (options?: { silent?: boolean }) => {
  if (!orderPortal.email || !selectedAttendee || !selectedEvent) return;
  
  const sessionToken = getSessionToken();
  if (!sessionToken) return;

  // Only show loading indicator if not a silent background refresh
  if (!options?.silent) {
    setConversationsLoading(true);
  }
  setConversationsError(null);

  try {
    const { data, error: fetchError } = await supabase.functions.invoke('get-attendee-conversations', {...});
    // ...
  } finally {
    setConversationsLoading(false);
  }
}, [/*deps*/]);
```

2. **Update realtime handlers** to use silent refresh:

```tsx
.on('postgres_changes', {...}, (payload) => {
  if (conversationIdsRef.current.includes(payload.new?.conversation_id)) {
    refreshConversations({ silent: true }); // <-- Silent
  }
})
```

3. **Fix combined loading state** (line 435):

```tsx
loading: orderPortal.loading || bookmarksLoading,  // Remove conversationsLoading
```

### File: `src/pages/attendee/Conversation.tsx`

1. **Get conversation immediately** (not via effect):

```tsx
// Remove the useState and useEffect for conversation
// Instead, compute directly:
const conversation = conversations.find(c => c.id === conversationId) || null;
```

2. **Show skeleton only on true initial load**:

```tsx
// Only show full skeleton if we have no conversation AND no cached messages
const cachedMessages = getCachedMessages(conversationId || '');
const hasAnyData = conversation || (cachedMessages && cachedMessages.length > 0);

if (!hasAnyData && (convsLoading || loading)) {
  return <FullPageSkeleton />;
}
```

3. **Header always renders** with fallback title:

```tsx
<h1 className="font-semibold truncate">
  {conversation ? getTitle() : 'Conversation'}
</h1>
```

### File: `src/hooks/useMessages.ts`

1. **Stabilize fetchMessages dependencies**:

Remove `getCachedMessages` and `setCachedMessages` from the dependency array since they're stable refs anyway.

2. **Prevent refetch loop**:

Only clear `hasFetchedRef` on conversationId change, not on every cleanup.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/AttendeeContext.tsx` | Add silent refresh option, fix loading state, update realtime handlers |
| `src/pages/attendee/Conversation.tsx` | Get conversation directly, conditional skeleton, stable header |
| `src/hooks/useMessages.ts` | Stabilize dependencies, fix hasFetchedRef logic |

---

## Before/After Behavior

| Scenario | Before | After |
|----------|--------|-------|
| Enter conversation | Slide in, then blank, then skeleton | Slide in with cached content immediately |
| New message received | Full page reload, skeleton | Background update, no visual disruption |
| Navigate back then forward | Full reload each time | Instant from cache |
| Header visibility | Flashes to skeleton | Always visible |

---

## Technical Notes

### Why Silent Refresh Works

The key insight is that `conversationsLoading` should only be `true` for user-initiated loads:
- **Initial load**: User lands on page → show skeleton
- **Background refresh**: Realtime update → DON'T show skeleton

This is the standard "stale-while-revalidate" UX pattern.

### Stable Callback Pattern

The `getCachedMessages` and `setCachedMessages` callbacks use `useCallback` but the cache itself is a `useRef`, so they're inherently stable. Removing them from dependency arrays is safe and prevents infinite loops.

