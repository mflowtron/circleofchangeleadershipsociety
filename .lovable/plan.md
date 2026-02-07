

# Improve Messages Feature - Transitions and Performance

## Overview

Two main improvements are needed:

1. **Add slide transitions** between the conversation list and individual conversations for a native app-like feel
2. **Reduce load times** by implementing eager loading and optimistic UI patterns

---

## Problems Identified

### Transition Issues
- Currently, navigation between Messages list and Conversation is an abrupt page swap
- No visual continuity between views makes the app feel less polished
- The Conversation page renders full-screen without any entry animation

### Performance Bottlenecks
1. **Edge function cold starts**: Functions take ~30-50ms to boot, but the actual request/response cycle adds latency
2. **Waterfall loading**: Conversations load first, then messages load when entering a conversation (sequential)
3. **No message caching**: Every time you enter a conversation, messages are fetched fresh even if already viewed
4. **Initial load shows skeleton**: Even with cached conversation data, users see loading states

---

## Solution

### Part 1: Slide Transitions

Add CSS-based slide animations that create a "stack" navigation pattern:
- Messages list slides left when opening a conversation
- Conversation slides in from the right
- Back navigation reverses the animation

**Implementation approach**:
- Create a new `useNavigationDirection` hook to track forward/back navigation
- Add slide-in-right and slide-out-left keyframes to tailwind config
- Apply animations to the Messages and Conversation page containers
- Use CSS transitions for smooth 250ms animations

```text
Messages List                     Conversation
+------------------+             +------------------+
|  [Search...]     |  ──────>    | <- Back    John  |
|  ┌──────────────┐|   slide     |                  |
|  │ John Doe    >│|   right     |  Hello there!    |
|  └──────────────┘|             |                  |
|  ┌──────────────┐|             |        Hi! ──>   |
|  │ Event Chat  >│|             |                  |
|  └──────────────┘|             | [Type message... ]|
+------------------+             +------------------+
```

### Part 2: Performance Optimizations

**A. Message Prefetching**
When a user hovers/focuses on a conversation card (or after a 500ms idle), prefetch that conversation's messages in the background.

**B. Message Caching in Context**
Store fetched messages in the AttendeeContext (keyed by conversation ID) so:
- Returning to a conversation shows cached messages instantly
- Real-time updates still append new messages
- Stale-while-revalidate pattern: show cached data, fetch fresh in background

**C. Optimistic Loading States**
- Show the conversation header immediately (from cached conversation data)
- Render any cached messages while fetching fresh data
- Remove skeleton entirely for conversations with cached messages

**D. Reduce Edge Function Overhead**
The get-attendee-conversations function makes multiple `Promise.all` calls for unread counts and participant counts. These can be parallelized better or calculated in a single query.

---

## Implementation Details

### 1. Add Slide Animation Keyframes

**File: `tailwind.config.ts`**

Add new keyframes for slide transitions:
```typescript
keyframes: {
  // ... existing keyframes
  "slide-in-from-right": {
    from: { transform: "translateX(100%)", opacity: "0" },
    to: { transform: "translateX(0)", opacity: "1" }
  },
  "slide-out-to-left": {
    from: { transform: "translateX(0)", opacity: "1" },
    to: { transform: "translateX(-30%)", opacity: "0.5" }
  },
  "slide-in-from-left": {
    from: { transform: "translateX(-30%)", opacity: "0.5" },
    to: { transform: "translateX(0)", opacity: "1" }
  },
  "slide-out-to-right": {
    from: { transform: "translateX(0)", opacity: "1" },
    to: { transform: "translateX(100%)", opacity: "0" }
  }
},
animation: {
  // ... existing animations
  "slide-in-from-right": "slide-in-from-right 0.25s ease-out forwards",
  "slide-out-to-left": "slide-out-to-left 0.25s ease-out forwards",
  "slide-in-from-left": "slide-in-from-left 0.25s ease-out forwards",
  "slide-out-to-right": "slide-out-to-right 0.25s ease-out forwards"
}
```

### 2. Create Navigation Direction Hook

**File: `src/hooks/useNavigationDirection.ts`** (new file)

Track whether navigation is forward (push) or backward (pop):
```typescript
export function useNavigationDirection() {
  // Use navigation type from react-router
  // Return 'forward' | 'back' based on history action
}
```

### 3. Update Messages Page with Exit Animation

**File: `src/pages/attendee/Messages.tsx`**

- Wrap content in an animated container
- Use `motion-safe` to respect reduced motion preferences

### 4. Update Conversation Page with Entry Animation

**File: `src/pages/attendee/Conversation.tsx`**

- Add slide-in-from-right animation on mount
- Add slide-out-to-right on back navigation

### 5. Add Message Cache to Context

**File: `src/contexts/AttendeeContext.tsx`**

Add:
- `messagesCache: Map<string, Message[]>` state
- `getCachedMessages(conversationId)` method
- `setCachedMessages(conversationId, messages)` method

### 6. Update useMessages Hook to Use Cache

**File: `src/hooks/useMessages.ts`**

- Check cache before showing loading state
- Return cached messages immediately
- Fetch fresh data in background (stale-while-revalidate)

### 7. Add Prefetch on Conversation Card Hover

**File: `src/components/attendee/ConversationCard.tsx`**

- Add `onMouseEnter` / `onFocus` handler
- Debounce prefetch by 300ms to avoid rapid fetches
- Prefetch messages in background

---

## Files to Create/Modify

| File | Type | Changes |
|------|------|---------|
| `tailwind.config.ts` | Modify | Add slide animation keyframes |
| `src/hooks/useNavigationDirection.ts` | Create | Hook to detect navigation direction |
| `src/pages/attendee/Messages.tsx` | Modify | Add animated container, prefetch logic |
| `src/pages/attendee/Conversation.tsx` | Modify | Add slide-in animation, use cached data |
| `src/contexts/AttendeeContext.tsx` | Modify | Add message cache state |
| `src/hooks/useMessages.ts` | Modify | Implement stale-while-revalidate pattern |
| `src/components/attendee/ConversationCard.tsx` | Modify | Add hover-to-prefetch |

---

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Messages list load | ~500-800ms (edge function) | Instant (cached in context) |
| Opening conversation | ~400-600ms (fetch messages) | Instant (show cache) + background refresh |
| Returning to conversation | ~400-600ms | Instant (from cache) |
| Perceived smoothness | Abrupt page swaps | Sliding transitions |

---

## Accessibility Considerations

- All slide animations use `motion-safe:` prefix
- Users with `prefers-reduced-motion` get instant transitions instead
- Focus management remains unchanged
- Keyboard navigation still works normally

