

# Standardize on Sonner Toast System

## Summary

Migrate the entire application from the dual Radix UI Toast + Sonner system to Sonner-only, creating a unified notification experience across all components.

---

## What Will Change

### Files to Delete (4 files)
- `src/components/ui/toast.tsx` - Radix UI toast primitives
- `src/components/ui/toaster.tsx` - Radix UI toaster component
- `src/components/ui/use-toast.ts` - Re-export wrapper
- `src/hooks/use-toast.ts` - Custom toast hook implementation

### Files to Update (24 files)

**App Entry Point:**
- `src/App.tsx` - Remove Radix `<Toaster />` import and component

**Hooks (10 files):**
- `src/hooks/useAnnouncements.ts`
- `src/hooks/useComments.ts`
- `src/hooks/useEvents.ts`
- `src/hooks/useModerationPosts.ts`
- `src/hooks/usePosts.ts`
- `src/hooks/useRecordingResources.ts`
- `src/hooks/useTicketTypes.ts`
- `src/hooks/useUserPosts.ts`
- `src/hooks/useBadgeTemplates.ts`
- `src/hooks/useOrders.ts`

**Pages (9 files):**
- `src/pages/Auth.tsx`
- `src/pages/Chapters.tsx`
- `src/pages/MyChapter.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Recordings.tsx`
- `src/pages/Users.tsx`
- `src/pages/attendee/AttendeeProfile.tsx`
- `src/pages/attendee/Conversation.tsx`
- `src/pages/attendee/Messages.tsx`
- `src/pages/attendee/Networking.tsx`
- `src/pages/events/Checkout.tsx`

**Components (4 files):**
- `src/components/attendee/QRCodeDisplay.tsx`
- `src/components/attendee/ReactionPicker.tsx`
- `src/components/feed/VideoUploadDialog.tsx`

### Package.json Update
- Remove `@radix-ui/react-toast` from dependencies

---

## Migration Pattern

### Before (Radix UI Toast)
```typescript
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const { toast } = useToast();
  
  // Success toast
  toast({
    title: 'Event created',
    description: 'Your event has been created successfully.',
  });
  
  // Error toast
  toast({
    title: 'Error creating event',
    description: error.message,
    variant: 'destructive',
  });
}
```

### After (Sonner)
```typescript
import { toast } from 'sonner';

function MyComponent() {
  // Success toast
  toast.success('Event created', { 
    description: 'Your event has been created successfully.' 
  });
  
  // Error toast
  toast.error('Error creating event', { 
    description: error.message 
  });
  
  // Neutral/info toast (no variant)
  toast('Chapter updated');
}
```

---

## Technical Details

### Conversion Rules

| Old Pattern | New Pattern |
|-------------|-------------|
| `toast({ title: "...", description: "..." })` | `toast.success("...", { description: "..." })` |
| `toast({ title: "...", variant: "destructive" })` | `toast.error("...")` |
| `toast({ title: "..." })` (short neutral) | `toast("...")` or `toast.success("...")` based on context |

### App.tsx Changes
```text
// Before
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
...
<Toaster />
<Sonner />

// After  
import { Toaster } from "@/components/ui/sonner";
...
<Toaster />
```

---

## Implementation Order

1. Update all 24 files to use Sonner syntax (imports and toast calls)
2. Update `App.tsx` to remove Radix Toaster
3. Delete the 4 obsolete toast files
4. Remove `@radix-ui/react-toast` from `package.json`

---

## Files Already Using Sonner (No Changes Needed)

These 18 files already use `import { toast } from 'sonner'`:
- `src/components/admin/RecentUsers.tsx`
- `src/components/attendee/AttachmentPicker.tsx`
- `src/components/events/AttendeesTable.tsx`
- `src/components/events/badges/BadgeDesigner.tsx`
- `src/components/events/badges/BadgeGeneratorDialog.tsx`
- `src/components/events/checkin/CheckInActivityFeed.tsx`
- `src/components/events/checkin/ManualCheckIn.tsx`
- `src/components/orders/MessageList.tsx`
- `src/components/recordings/RecordingPlayerView.tsx`
- `src/hooks/useAgendaItems.ts`
- `src/hooks/useEventHotels.ts`
- `src/hooks/useLMSEvents.ts`
- `src/hooks/useSpeakers.ts`
- `src/pages/events/manage/CheckIn.tsx`
- `src/pages/events/manage/OrderDetail.tsx`
- `src/pages/events/OrderAttendees.tsx`
- `src/pages/Users.tsx` (already has sonner import, will verify)

