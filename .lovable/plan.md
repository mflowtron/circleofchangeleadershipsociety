

# Migrate usePosts and useMessages to React Query

## Summary

Migrate two data-fetching hooks from manual `useState`/`useEffect` patterns to React Query, aligning them with the patterns already established in `useEvents.ts` and `useOrders.ts`. This will improve caching, reduce boilerplate, and provide automatic refetching and cache invalidation.

---

## Files to Modify

| File | Description |
|------|-------------|
| `src/hooks/usePosts.ts` | Complete rewrite to use `useQuery` + `useMutation` |
| `src/hooks/useMessages.ts` | Complete rewrite to use `useQuery` + `useMutation` with realtime |

---

## Part 1: Migrate usePosts.ts

### Current State
- Uses `useState` for `posts` and `loading`
- Uses `useCallback` for `fetchPosts` with manual enrichment logic
- Uses `useEffect` to trigger initial fetch
- Manual functions for `createPost`, `toggleLike`, `deletePost`
- Optimistic updates using `setPosts`

### Migration Approach

**Query Setup:**
```typescript
useQuery({
  queryKey: ['posts', filter, profile?.chapter_id],
  queryFn: async () => { /* existing fetch + enrichment logic */ },
  enabled: !!user
})
```

**Mutations:**
- `createPost` -> `useMutation` with `invalidateQueries(['posts'])`
- `deletePost` -> `useMutation` with `invalidateQueries(['posts'])`
- `toggleLike` -> `useMutation` with optimistic update via `onMutate`/`onError`/`onSettled`

**Return Shape (unchanged):**
```typescript
{ posts, loading, createPost, toggleLike, deletePost, refetch, isCreating }
```

### Key Implementation Details

1. **Query Key Design**: `['posts', filter]` - allows cached switching between `all`, `chapter`, and `mine` filters
2. **Enrichment in queryFn**: Keep all the batch fetching (profiles, likes, comments) inside the `queryFn`
3. **Optimistic Toggle Like**: Use React Query's `onMutate` to update cache, `onError` to rollback, `onSettled` to refetch
4. **Image Upload**: Keep `uploadImage` as a helper function (not a mutation)

---

## Part 2: Migrate useMessages.ts

### Current State
- Uses `useState` for `messages`, `loading`, `error`, `hasMore`, `sending`
- Uses `useRef` for realtime channel and fetch flags
- Manual cache from `AttendeeContext` (getCachedMessages/setCachedMessages)
- Supabase realtime subscription for live updates
- Optimistic updates for sending messages and reactions

### Migration Approach

**Query Setup:**
```typescript
useQuery({
  queryKey: ['messages', conversationId],
  queryFn: fetchMessages,
  enabled: !!conversationId && isAuthenticated && !!selectedAttendee,
  placeholderData: () => getCachedMessages(conversationId),
  staleTime: 0 // Always refetch since realtime updates
})
```

**Mutations:**
- `sendMessage` -> `useMutation` with optimistic update
- `sendMessageWithAttachment` -> `useMutation` with optimistic update  
- `toggleReaction` -> `useMutation` with optimistic update

**Realtime Integration:**
```typescript
// Instead of setMessages(prev => [...prev, newMsg])
queryClient.setQueryData(['messages', conversationId], (old) => {
  // Add new message if not already present
});
// Or invalidate for full refresh:
queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
```

**Return Shape (unchanged):**
```typescript
{ messages, loading, error, sending, hasMore, sendMessage, sendMessageWithAttachment, loadMore, toggleReaction, getReactors, refetch }
```

### Key Implementation Details

1. **Stale-While-Revalidate**: Use `placeholderData` to show cached messages instantly
2. **Pagination (loadMore)**: Keep as a separate function that fetches older messages and merges with cache
3. **Realtime Messages**: Update query cache directly when realtime event arrives (for instant UI update) or invalidate for full refresh
4. **Optimistic Sends**: Use `onMutate` to add temporary message, `onError` to mark as failed, `onSettled` to replace with real message
5. **Keep AttendeeContext Integration**: Still call `setCachedMessages` after fetch for hover prefetch feature
6. **Channel Cleanup**: Keep the `useEffect` with cleanup for realtime subscription

---

## Technical Details

### React Query Configuration (already in App.tsx)
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

### Optimistic Update Pattern for Toggle Like
```typescript
const toggleLikeMutation = useMutation({
  mutationFn: async ({ postId, hasLiked }) => { /* API call */ },
  onMutate: async ({ postId, hasLiked }) => {
    await queryClient.cancelQueries({ queryKey: ['posts'] });
    const previousPosts = queryClient.getQueryData(['posts', filter]);
    queryClient.setQueryData(['posts', filter], (old) => 
      old.map(post => post.id === postId 
        ? { ...post, user_has_liked: !hasLiked, likes_count: hasLiked ? post.likes_count - 1 : post.likes_count + 1 }
        : post
      )
    );
    return { previousPosts };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['posts', filter], context.previousPosts);
    toast.error('Error', { description: err.message });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  }
});
```

### Optimistic Send Message Pattern
```typescript
const sendMessageMutation = useMutation({
  mutationFn: async ({ content, replyToId }) => { /* API call */ },
  onMutate: async ({ content }) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = { id: tempId, content, status: 'sending', ... };
    queryClient.setQueryData(['messages', conversationId], (old) => [...old, optimisticMessage]);
    return { tempId };
  },
  onSuccess: (data, variables, context) => {
    // Replace temp with real message
    queryClient.setQueryData(['messages', conversationId], (old) =>
      old.map(m => m.id === context.tempId ? { ...data.message, status: 'sent' } : m)
    );
  },
  onError: (err, variables, context) => {
    // Mark as failed
    queryClient.setQueryData(['messages', conversationId], (old) =>
      old.map(m => m.id === context.tempId ? { ...m, status: 'failed' } : m)
    );
  }
});
```

---

## Component Compatibility

### Feed.tsx (uses usePosts)
Current usage:
```typescript
const { posts, loading, createPost, toggleLike, deletePost, refetch } = usePosts(filter);
```
After migration: No changes needed - same return shape

### Conversation.tsx (uses useMessages)
Current usage:
```typescript
const { messages, loading, sending, hasMore, sendMessage, sendMessageWithAttachment, loadMore, toggleReaction, getReactors } = useMessages(conversationId || null);
```
After migration: No changes needed - same return shape

---

## Implementation Order

1. **usePosts.ts Migration**
   - Replace useState/useEffect with useQuery
   - Convert createPost to useMutation
   - Convert deletePost to useMutation
   - Convert toggleLike to useMutation with optimistic update
   - Keep uploadImage as helper function

2. **useMessages.ts Migration**
   - Replace useState/useEffect with useQuery
   - Convert sendMessage to useMutation with optimistic update
   - Convert sendMessageWithAttachment to useMutation with optimistic update
   - Convert toggleReaction to useMutation with optimistic update
   - Update realtime subscription to use queryClient.setQueryData
   - Keep loadMore and getReactors as regular functions
   - Keep channel cleanup in useEffect

---

## Benefits After Migration

| Aspect | Before | After |
|--------|--------|-------|
| Cache Management | Manual useState + context | React Query automatic |
| Filter Switching | Refetches every time | Instant from cache |
| Loading States | Manual boolean | Built-in isLoading/isPending |
| Error Handling | Manual try/catch + state | Built-in error state |
| Optimistic Updates | Manual setPosts | Structured onMutate/onError |
| Stale Data | Manual implementation | Built-in staleTime |
| Refetching | Manual function | Built-in refetch + invalidate |

