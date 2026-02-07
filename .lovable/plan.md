

# Add Message Reactions

## Overview

Add emoji reactions (like, heart, thumbs up, etc.) to messages, allowing attendees to quickly respond to messages without typing a full reply. This is a common feature in modern messaging apps like Slack, iMessage, and WhatsApp.

---

## User Experience

### Adding a Reaction
- Long-press (mobile) or hover (desktop) on a message reveals a reaction picker
- Quick-access emoji bar shows common reactions: 👍 ❤️ 😂 😮 😢 🎉
- Tapping an emoji adds the reaction immediately (optimistic UI)
- Tapping the same emoji again removes the reaction

### Viewing Reactions
- Reactions appear below the message bubble as small emoji chips
- Each chip shows the emoji and count (e.g., "👍 3")
- Tapping a reaction chip shows who reacted (optional enhancement)

### Visual Design
```text
┌─────────────────────────────────────┐
│  Great presentation today!          │
└─────────────────────────────────────┘
  [👍 2] [❤️ 1]          3:42 PM

     ↓ Long-press shows picker ↓

┌─────────────────────────────────────┐
│  Great presentation today!          │
└─────────────────────────────────────┘
    ┌────────────────────────┐
    │ 👍  ❤️  😂  😮  😢  🎉 │
    └────────────────────────┘
```

---

## Database Schema

### New Table: `message_reactions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `message_id` | uuid | FK to attendee_messages |
| `attendee_id` | uuid | FK to attendees (who reacted) |
| `speaker_id` | uuid | FK to speakers (if speaker reacted) |
| `emoji` | text | The emoji character (e.g., "👍") |
| `created_at` | timestamptz | When reaction was added |

**Constraints:**
- Unique constraint on (message_id, attendee_id, emoji) - one reaction type per person per message
- Either attendee_id OR speaker_id must be set (not both)

**Indexes:**
- Index on `message_id` for fast reaction lookups
- Composite index on `(message_id, emoji)` for aggregation

---

## Implementation Details

### 1. Database Migration

```sql
-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.attendee_messages(id) ON DELETE CASCADE,
  attendee_id uuid REFERENCES public.attendees(id) ON DELETE CASCADE,
  speaker_id uuid REFERENCES public.speakers(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Only one reaction type per person per message
  CONSTRAINT unique_attendee_reaction UNIQUE (message_id, attendee_id, emoji),
  CONSTRAINT unique_speaker_reaction UNIQUE (message_id, speaker_id, emoji),
  
  -- Must have either attendee or speaker
  CONSTRAINT sender_check CHECK (
    (attendee_id IS NOT NULL AND speaker_id IS NULL) OR
    (attendee_id IS NULL AND speaker_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_message_emoji ON public.message_reactions(message_id, emoji);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
```

### 2. Edge Function: `toggle-message-reaction`

Creates or removes a reaction (toggle behavior):

```typescript
// Input: { email, session_token, attendee_id, message_id, emoji }
// 1. Validate session
// 2. Verify attendee is participant of the message's conversation
// 3. Check if reaction exists
//    - If exists: DELETE it
//    - If not: INSERT it
// 4. Return updated reaction counts for the message
```

### 3. Update `get-conversation-messages` Edge Function

Include reaction counts in message response:

```typescript
// After fetching messages, batch fetch reactions
const messageIds = messages.map(m => m.id);

// Single query to get all reactions for all messages
const { data: reactions } = await supabase
  .from('message_reactions')
  .select('message_id, emoji, attendee_id, speaker_id')
  .in('message_id', messageIds);

// Aggregate reactions by message and emoji
// { "msg-id-1": { "👍": { count: 3, reacted: true }, "❤️": { count: 1, reacted: false } } }

// Include in response:
// message.reactions: Array<{ emoji: string, count: number, reacted: boolean }>
```

### 4. Frontend: Update Message Interface

```typescript
export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean; // Did current user react with this emoji?
}

export interface Message {
  // ... existing fields
  reactions?: MessageReaction[];
}
```

### 5. Frontend: `useMessageReactions` Hook

```typescript
function useMessageReactions(conversationId: string) {
  // Toggle reaction with optimistic update
  const toggleReaction = async (messageId: string, emoji: string) => {
    // 1. Optimistically update local state
    // 2. Call toggle-message-reaction edge function
    // 3. Revert on error
  };
  
  return { toggleReaction };
}
```

### 6. Frontend: `ReactionPicker` Component

A small popup with emoji buttons:

```tsx
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

function ReactionPicker({ onSelect, onClose }) {
  return (
    <div className="flex gap-1 bg-background border rounded-full px-2 py-1 shadow-lg">
      {REACTIONS.map(emoji => (
        <button 
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="p-1 hover:bg-muted rounded-full text-lg"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
```

### 7. Frontend: `ReactionBar` Component

Shows existing reactions below a message:

```tsx
function ReactionBar({ reactions, onToggle }) {
  return (
    <div className="flex gap-1 mt-1 flex-wrap">
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji)}
          className={cn(
            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs",
            r.reacted 
              ? "bg-primary/20 text-primary border border-primary/30" 
              : "bg-muted text-muted-foreground"
          )}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
    </div>
  );
}
```

### 8. Update `MessageBubble` Component

Add reaction picker trigger and display:

```tsx
function MessageBubble({ message, showSender, onReaction }) {
  const [showPicker, setShowPicker] = useState(false);
  
  return (
    <div 
      onContextMenu={(e) => { e.preventDefault(); setShowPicker(true); }}
      onTouchStart={/* long press handler */}
    >
      {/* Message content */}
      <div className="bg-muted rounded-2xl px-4 py-2">
        <p>{message.content}</p>
      </div>
      
      {/* Reactions bar */}
      {message.reactions?.length > 0 && (
        <ReactionBar 
          reactions={message.reactions} 
          onToggle={(emoji) => onReaction(message.id, emoji)} 
        />
      )}
      
      {/* Reaction picker popup */}
      {showPicker && (
        <ReactionPicker 
          onSelect={(emoji) => {
            onReaction(message.id, emoji);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
```

---

## Realtime Updates

Subscribe to reaction changes so all participants see reactions instantly:

```typescript
// In useMessages hook
supabase
  .channel(`reactions-${conversationId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'message_reactions',
    // Filter to only reactions for messages in this conversation
  }, () => {
    // Refetch messages or update reaction counts locally
  })
  .subscribe();
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_add_message_reactions.sql` | Create | New table and indexes |
| `supabase/functions/toggle-message-reaction/index.ts` | Create | Toggle reaction endpoint |
| `supabase/functions/get-conversation-messages/index.ts` | Modify | Include reaction data |
| `src/hooks/useMessages.ts` | Modify | Add reaction interfaces and toggle function |
| `src/components/attendee/ReactionPicker.tsx` | Create | Emoji picker popup |
| `src/components/attendee/ReactionBar.tsx` | Create | Display reactions below message |
| `src/components/attendee/MessageBubble.tsx` | Modify | Integrate picker and bar |
| `src/pages/attendee/Conversation.tsx` | Modify | Pass reaction handler to bubbles |

---

## Technical Considerations

### Performance
- Reactions are fetched in batch with messages (no N+1)
- Aggregation done in memory after single query
- Realtime only triggers for relevant conversations

### Optimistic UI
- Reaction appears/disappears immediately on tap
- Reverts if API call fails with toast notification

### Mobile UX
- Long-press to show picker (500ms delay)
- Picker positioned above/below message based on screen space
- Backdrop to dismiss picker

### Edge Cases
- Own messages show reactions on the right side
- Deleted messages: cascade delete removes reactions
- Offline: queue reaction and sync when back online (future)

