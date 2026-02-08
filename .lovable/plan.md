
# Add Confirmation Dialog for Push Notifications

## Overview
Add a confirmation dialog before sending push notifications to prevent accidental sends. This provides a safety check showing the notification details and recipient count before final confirmation.

---

## Implementation Approach

Use the existing `AlertDialog` component from the UI library to show a confirmation modal when the user clicks "Send Notification".

---

## Changes to NotificationComposer

### 1. Add State for Dialog

```typescript
const [showConfirmDialog, setShowConfirmDialog] = useState(false);
```

### 2. Modify Submit Flow

Instead of sending immediately on form submit:
1. Form submit opens the confirmation dialog
2. Dialog shows notification preview (title, message, recipient count)
3. "Confirm" button triggers the actual send
4. "Cancel" button closes the dialog without sending

### 3. Dialog Content

The confirmation dialog will display:
- Warning icon to draw attention
- Title: "Send Push Notification?"
- Preview of the notification title and message
- Audience type and recipient count
- Clear warning that this action cannot be undone
- Cancel and Confirm buttons

---

## UI Design

```text
┌──────────────────────────────────────────────────────────┐
│  ⚠️ Send Push Notification?                              │
│                                                          │
│  You are about to send a notification to 125 attendees.  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Title: Welcome to CLC 2026!                       │  │
│  │  Message: Doors open in 15 minutes. Head to the... │  │
│  │  Audience: All Attendees                           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  This action cannot be undone. Notifications will be     │
│  sent immediately to all targeted devices.               │
│                                                          │
│                            [Cancel]  [Send Notification] │
└──────────────────────────────────────────────────────────┘
```

---

## Code Changes

### File: `src/components/events/push/NotificationComposer.tsx`

**Add imports:**
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
```

**Add state:**
```typescript
const [showConfirmDialog, setShowConfirmDialog] = useState(false);
```

**Modify handleSubmit:**
- Rename to `handleConfirm` for the actual send logic
- Create new `handleSubmit` that opens the dialog instead

**Add helper function:**
```typescript
const getAudienceLabel = () => {
  switch (audienceType) {
    case 'all': return 'All Attendees';
    case 'in_person': return 'In-Person Only';
    case 'virtual': return 'Virtual Only';
    case 'ticket_type': return 'By Ticket Type';
    case 'individual': return 'Individual Attendees';
    default: return audienceType;
  }
};
```

**Add AlertDialog component** after the form, showing:
- Recipient count in the description
- Preview card with title, message (truncated), and audience type
- Warning about immediate delivery
- Cancel and confirm actions

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/events/push/NotificationComposer.tsx` | Modify | Add AlertDialog confirmation before sending |

---

## Technical Notes

- Uses existing AlertDialog component (already in the project)
- Dialog is controlled by state, not a trigger element
- Message preview truncated to prevent dialog overflow
- Confirm button disabled while sending to prevent double-sends
- Dialog closes automatically after successful send (form reset already handles this)
