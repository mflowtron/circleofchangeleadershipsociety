

# Optimize Messaging Performance

## Analysis Summary

After reviewing the entire messaging codebase, I've identified **critical N+1 query problems** in the backend Edge Functions that are the primary cause of slow performance. The frontend has some minor inefficiencies, but the backend is the main bottleneck.

---

## Performance Issues Identified

### Critical: N+1 Query Problems in Edge Functions

| Function | Issue | Impact |
|----------|-------|--------|
| `get-conversation-messages` | For each message, makes 2-6 separate DB queries to fetch sender info, profiles, and reply data | 50 messages = 100-300 queries |
| `get-attendee-conversations` | For each conversation, makes 4-6 separate queries for last message, unread count, other participant, participant count | 10 conversations = 40-60 queries |

### Moderate: Frontend Re-renders

| Component | Issue | Impact |
|-----------|-------|--------|
| `useConversations` | Realtime subscription on ALL messages triggers full refetch | Frequent unnecessary API calls |
| `Conversation.tsx` | Fetches all conversations just to find one by ID | Redundant data fetching |
| `MessageBubble` | Not memoized; re-renders on any parent state change | Minor UI performance impact |

### Minor: Missing Index

| Table | Column | Query Pattern |
|-------|--------|---------------|
| `attendee_messages` | `sender_attendee_id` | Filtered in unread count queries |

---

## Solution: Batch Queries in Edge Functions

### 1. Optimize `get-conversation-messages` (High Impact)

**Current approach** (N+1 pattern):
```
For each message:
  → Query attendees table
  → Query attendee_profiles table
  → If reply: Query attendee_messages
  → If reply from attendee: Query attendee_profiles again
```

**Optimized approach** (Batch queries):
```text
1. Fetch all messages in one query
2. Collect unique sender_attendee_ids and sender_speaker_ids
3. Batch fetch all attendees in one query
4. Batch fetch all profiles in one query
5. Batch fetch all speakers in one query
6. Collect unique reply_to_ids, batch fetch original messages
7. Enrich messages in memory using lookup maps
```

### 2. Optimize `get-attendee-conversations` (High Impact)

**Current approach** (N+1 pattern):
```
For each conversation:
  → Query last message
  → Query unread count
  → Query other participants
  → Query attendee/speaker info for other participant
  → Query participant count
```

**Optimized approach**:
```text
1. Get all participant records for user in one query
2. Get all conversations in one query
3. Batch query last messages (WHERE conversation_id IN (...))
4. Use a single aggregated query for unread counts
5. Batch query all other participants
6. Batch query all attendee/speaker info
7. Assemble results in memory
```

### 3. Optimize Frontend Realtime Subscriptions

**Current**: Subscribes to ALL `attendee_messages` inserts globally, which triggers refetch even for unrelated conversations.

**Optimized**: Filter realtime subscription by `event_id` or user's conversation IDs to reduce unnecessary triggers.

### 4. Memoize React Components

Add `React.memo` to `MessageBubble` and `ConversationCard` to prevent unnecessary re-renders.

### 5. Add Missing Database Index

Add index on `attendee_messages.sender_attendee_id` for faster unread count filtering.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/get-conversation-messages/index.ts` | Rewrite with batch queries using lookup maps |
| `supabase/functions/get-attendee-conversations/index.ts` | Rewrite with batch queries for all enrichment |
| `src/components/attendee/MessageBubble.tsx` | Wrap with `React.memo` |
| `src/components/attendee/ConversationCard.tsx` | Wrap with `React.memo` |
| `src/hooks/useConversations.ts` | Scope realtime subscription more narrowly |
| New migration | Add index on `sender_attendee_id` |

---

## Technical Implementation

### Batch Query Pattern for Messages

```typescript
// 1. Fetch all messages
const { data: messages } = await supabase
  .from('attendee_messages')
  .select('*')
  .eq('conversation_id', conversation_id)
  .order('created_at', { ascending: false })
  .limit(limit);

// 2. Collect unique IDs
const attendeeIds = [...new Set(messages.filter(m => m.sender_attendee_id).map(m => m.sender_attendee_id))];
const speakerIds = [...new Set(messages.filter(m => m.sender_speaker_id).map(m => m.sender_speaker_id))];
const replyIds = [...new Set(messages.filter(m => m.reply_to_id).map(m => m.reply_to_id))];

// 3. Batch fetch (3 queries instead of 50-300)
const [attendees, profiles, speakers, replyMessages] = await Promise.all([
  supabase.from('attendees').select('id, attendee_name').in('id', attendeeIds),
  supabase.from('attendee_profiles').select('attendee_id, display_name, avatar_url').in('attendee_id', attendeeIds),
  supabase.from('speakers').select('id, name, photo_url, title, company').in('id', speakerIds),
  supabase.from('attendee_messages').select('id, content, sender_attendee_id, sender_speaker_id').in('id', replyIds)
]);

// 4. Build lookup maps for O(1) access
const attendeeMap = new Map(attendees.data?.map(a => [a.id, a]));
const profileMap = new Map(profiles.data?.map(p => [p.attendee_id, p]));
const speakerMap = new Map(speakers.data?.map(s => [s.id, s]));
const replyMap = new Map(replyMessages.data?.map(m => [m.id, m]));

// 5. Enrich messages in memory (no additional queries)
const enrichedMessages = messages.map(msg => {
  // Use maps for instant lookup...
});
```

### Optimized Unread Count Query

Instead of one query per conversation, use a single aggregated query:

```sql
SELECT 
  conversation_id,
  COUNT(*) as unread_count
FROM attendee_messages
WHERE conversation_id = ANY($1)
  AND is_deleted = false
  AND sender_attendee_id != $2
  AND created_at > (
    SELECT last_read_at FROM conversation_participants 
    WHERE conversation_id = attendee_messages.conversation_id 
    AND attendee_id = $2
  )
GROUP BY conversation_id
```

---

## Expected Performance Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| `get-conversation-messages` (50 msgs) | 100-300 queries | 5-8 queries | 95%+ reduction |
| `get-attendee-conversations` (10 convs) | 40-60 queries | 6-10 queries | 80%+ reduction |
| Response time | 2-5 seconds | 200-500ms | 4-10x faster |

---

## Implementation Order

1. **Backend Edge Functions** (highest impact)
   - Optimize `get-conversation-messages` with batch queries
   - Optimize `get-attendee-conversations` with batch queries

2. **Database**
   - Add index on `sender_attendee_id`

3. **Frontend** (lower impact)
   - Memoize components
   - Scope realtime subscriptions

