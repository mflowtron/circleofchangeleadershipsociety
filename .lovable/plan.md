

# Add Copy Message Text Option

## Overview

Since text selection is now disabled on message bubbles to enable the long-press reaction gesture, we need to provide an alternative way for users to copy message text. This will add a "Copy" button to the reaction picker that appears on long-press.

---

## Solution

Extend the `ReactionPicker` component to include a "Copy" action button alongside the emoji reactions. When tapped, it copies the message text to the clipboard and shows a toast confirmation.

### Visual Design
```text
Long-press on message:
        ↓
┌─────────────────────────────────────────┐
│  👍  ❤️  😂  😮  😢  🎉  │  📋 Copy  │
└─────────────────────────────────────────┘
```

---

## Technical Changes

### 1. Update `ReactionPicker` Component

Add a new `messageContent` prop and a "Copy" button:

```tsx
// src/components/attendee/ReactionPicker.tsx
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isOwn?: boolean;
  messageContent?: string;  // NEW: The text to copy
}

export const ReactionPicker = memo(function ReactionPicker({ 
  onSelect, 
  onClose,
  isOwn = false,
  messageContent
}: ReactionPickerProps) {
  const { toast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!messageContent) {
      onClose();
      return;
    }
    
    try {
      await navigator.clipboard.writeText(messageContent);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onTouchEnd={onClose}
      />
      
      {/* Picker */}
      <div 
        className={cn(
          "absolute z-50 flex items-center gap-1 bg-background border border-border rounded-full px-2 py-1.5 shadow-lg",
          isOwn ? "right-0" : "left-0",
          "-top-10"
        )}
      >
        {REACTIONS.map(emoji => (
          <button 
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(emoji);
            }}
            className="p-1.5 hover:bg-muted rounded-full text-lg transition-colors active:scale-110"
          >
            {emoji}
          </button>
        ))}
        
        {/* Divider and Copy button - only show if there's content */}
        {messageContent && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-muted rounded-full transition-colors active:scale-110 flex items-center gap-1"
            >
              <Copy className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </>
  );
});
```

### 2. Update `MessageBubble` Component

Pass the message content to the `ReactionPicker`:

```tsx
// In both own and received message sections:
{showPicker && (
  <ReactionPicker 
    onSelect={handleReactionSelect}
    onClose={() => setShowPicker(false)}
    isOwn={true/false}
    messageContent={message.content}  // NEW
  />
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/attendee/ReactionPicker.tsx` | Add `messageContent` prop, Copy button with clipboard API, toast feedback |
| `src/components/attendee/MessageBubble.tsx` | Pass `message.content` to ReactionPicker in both places |

---

## Implementation Details

- **Clipboard API**: Uses `navigator.clipboard.writeText()` (same pattern as QRCodeDisplay)
- **Toast Feedback**: Shows "Copied!" on success, "Failed to copy" on error
- **Only for text**: Copy button only appears if `messageContent` exists (not for attachment-only messages)
- **Visual separator**: A subtle divider line separates emoji reactions from the copy action

