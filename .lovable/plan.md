
# Show Who Reacted to a Message

## Overview

Add the ability to see who reacted to a message by tapping on a reaction chip. This will display a popover showing the names and avatars of users who used that emoji reaction.

---

## User Experience

### Viewing Reactors
- Tap on any reaction chip (e.g., "👍 3")
- A popover appears showing the list of people who reacted with that emoji
- Each person shows their avatar, name, and (for speakers) their role
- Tapping the reaction chip also toggles your own reaction (existing behavior)

### Visual Design
```text
Tap on [👍 3]
        ↓
┌─────────────────────────────┐
│  👍 Reactions               │
├─────────────────────────────┤
│  [Avatar] Jane Smith        │
│  [Avatar] John Doe          │
│  [Avatar] Dr. Kim (Speaker) │
└─────────────────────────────┘
```

---

## Implementation Details

### 1. New Edge Function: `get-message-reactors`

Create a new function to fetch the list of people who reacted with a specific emoji:

```typescript
// Input: { email, session_token, attendee_id, message_id, emoji }
// 1. Validate session
// 2. Verify attendee is participant of the message's conversation
// 3. Fetch all reactions for this message + emoji
// 4. Enrich with attendee/speaker names and avatars
// 5. Return list of reactors

// Response:
{
  reactors: [
    { type: 'attendee', id: '...', name: 'Jane Smith', avatar_url: '...' },
    { type: 'speaker', id: '...', name: 'Dr. Kim', avatar_url: '...', title: 'Keynote Speaker' }
  ]
}
```

### 2. Frontend: Update `ReactionBar` Component

Modify the reaction chips to open a popover on tap instead of immediately toggling:

- **Short tap**: Open popover showing who reacted
- **Popover footer**: "Tap to add/remove your reaction" button

Or simpler approach:
- **Tap**: Toggle reaction (keep existing behavior)
- **Long press / hold**: Show who reacted

Given the existing toggle-on-tap pattern, I recommend using a popover that:
1. Opens on tap
2. Shows the reactor list
3. Has a button at the bottom to toggle your reaction

### 3. New Component: `ReactionDetailsPopover`

A popover component that shows who reacted:

```tsx
function ReactionDetailsPopover({ 
  emoji, 
  messageId, 
  count,
  reacted,
  onToggle,
  isOwn 
}) {
  const [reactors, setReactors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch reactors when popover opens
  useEffect(() => {
    fetchReactors();
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Reaction chip button */}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b">
            <span className="text-xl">{emoji}</span>
            <span className="font-medium">Reactions</span>
          </div>
          
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2">
              {reactors.map(reactor => (
                <div key={reactor.id} className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={reactor.avatar_url} />
                    <AvatarFallback>{reactor.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{reactor.name}</span>
                  {reactor.type === 'speaker' && (
                    <Badge variant="secondary" className="text-xs">Speaker</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full" 
            onClick={onToggle}
          >
            {reacted ? 'Remove your reaction' : 'Add your reaction'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### 4. Update `useMessages` Hook

Add a function to fetch reactors:

```typescript
const getReactors = useCallback(async (messageId: string, emoji: string) => {
  const { data, error } = await supabase.functions.invoke('get-message-reactors', {
    body: {
      email,
      session_token: sessionToken,
      attendee_id: selectedAttendee.id,
      message_id: messageId,
      emoji
    }
  });
  
  if (error || data?.error) throw error;
  return data.reactors;
}, [email, sessionToken, selectedAttendee]);
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/get-message-reactors/index.ts` | Create | Fetch reactor details for a message + emoji |
| `src/components/attendee/ReactionDetailsPopover.tsx` | Create | Popover showing who reacted |
| `src/components/attendee/ReactionBar.tsx` | Modify | Replace buttons with popover triggers |
| `src/hooks/useMessages.ts` | Modify | Add `getReactors` function |
| `src/pages/attendee/Conversation.tsx` | Modify | Pass getReactors to ReactionBar |

---

## Technical Considerations

### Performance
- Reactors only fetched when popover opens (lazy loading)
- Light query - just needs message_id + emoji filter
- Batch fetch attendee/speaker info in single queries

### UX Trade-offs
- Popover approach means one extra tap to toggle reactions
- Alternative: Keep tap-to-toggle, add info icon or long-press for details
- Recommended: Popover with toggle button inside (cleaner, more discoverable)

### Edge Cases
- Empty reactors list (shouldn't happen if chip is visible)
- Many reactors: Scrollable list with max height
- Current user in list: Highlight or show "You" instead of name
