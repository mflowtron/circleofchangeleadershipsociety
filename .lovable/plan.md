

# Add Sending State Visual Feedback for Messages

## Overview

Implement optimistic UI for message sending - when a user sends a message, it should immediately appear in the chat as a bubble with a visual indicator that it's still being sent (similar to iMessage, WhatsApp, etc.).

## Current Behavior

1. User types message and hits send
2. Input is disabled while `sending` state is true
3. **Nothing appears in the message list**
4. After API responds, message appears fully sent

## Desired Behavior

1. User types message and hits send
2. Message **immediately appears** in the list with a "sending" visual state
3. Bubble shows reduced opacity and a small clock/spinner icon
4. Once API confirms, bubble transitions to full opacity with a checkmark
5. If failed, show error state with option to retry

---

## Implementation

### 1. Extend Message Interface

Add a `status` field to track message state:

```typescript
export interface Message {
  // ... existing fields
  status?: 'sending' | 'sent' | 'failed';  // New field
}
```

### 2. Update useMessages Hook

Implement optimistic UI pattern:

```typescript
const sendMessage = useCallback(async (content: string, replyToId?: string) => {
  // Create optimistic message with temporary ID
  const tempId = `temp-${Date.now()}`;
  const optimisticMessage: Message = {
    id: tempId,
    conversation_id: conversationId!,
    content,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sender: {
      type: 'attendee',
      id: selectedAttendee!.id,
      name: selectedAttendee!.name || 'You',
      avatar_url: selectedAttendee!.avatar_url,
    },
    is_own: true,
    status: 'sending',  // Mark as sending
  };

  // Add to list immediately
  setMessages(prev => [...prev, optimisticMessage]);
  setSending(true);

  try {
    const { data, error } = await supabase.functions.invoke(...);
    
    if (error || data?.error) throw new Error(...);

    // Replace temp message with real one
    setMessages(prev => prev.map(m => 
      m.id === tempId 
        ? { ...data.message, status: 'sent' }
        : m
    ));
    
    return { success: true };
  } catch (err) {
    // Mark as failed
    setMessages(prev => prev.map(m => 
      m.id === tempId 
        ? { ...m, status: 'failed' }
        : m
    ));
    return { success: false, error: err.message };
  } finally {
    setSending(false);
  }
}, [...]);
```

### 3. Update MessageBubble Component

Add visual states for sending/failed:

```tsx
export function MessageBubble({ message, showSender = true }: MessageBubbleProps) {
  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';
  
  // For own messages
  if (message.is_own) {
    return (
      <div className={cn(
        "flex justify-end mb-3",
        isSending && "opacity-70"  // Reduce opacity while sending
      )}>
        <div className="max-w-[80%]">
          {/* Bubble */}
          <div className={cn(
            "bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2",
            isFailed && "bg-destructive"
          )}>
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center justify-end gap-1 mt-1">
            {isSending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sending...</span>
              </>
            ) : isFailed ? (
              <span className="text-xs text-destructive">Failed to send</span>
            ) : (
              <p className="text-xs text-muted-foreground">{time}</p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // ... rest of component for received messages
}
```

---

## Visual Design

```text
SENDING STATE                      SENT STATE
┌─────────────────────┐           ┌─────────────────────┐
│                     │           │                     │
│     [Message text]  │ ← 70%     │     [Message text]  │ ← 100%
│                     │   opacity │                     │   opacity
└─────────────────────┘           └─────────────────────┘
        ◌ Sending...                      2:30 PM ✓

FAILED STATE
┌─────────────────────┐
│                     │
│     [Message text]  │ ← Red tint
│                     │
└─────────────────────┘
        ⚠ Failed to send
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useMessages.ts` | Add `status` to Message interface, implement optimistic updates |
| `src/components/attendee/MessageBubble.tsx` | Add visual states for sending/failed with icons |

---

## Technical Details

### Message Status Flow

```text
User sends → status: 'sending' (optimistic) → API responds
                                                   ↓
                                           ┌──────┴──────┐
                                           ↓             ↓
                                    status: 'sent'  status: 'failed'
```

### Animation

The transition from sending to sent will be smooth using Tailwind transitions:
- Opacity change: `transition-opacity duration-200`
- The spinner will fade out and timestamp will fade in

### Edge Cases

1. **Quick send**: If API responds very fast, user might not even see the spinner (this is fine)
2. **Failed message**: Keep in list with red styling so user can see what failed
3. **Retry**: Could add a retry button for failed messages (future enhancement)

