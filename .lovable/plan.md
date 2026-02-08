
# Schema Simplification Cleanup - Final Tasks

## Summary

Complete the final cleanup tasks for the schema simplification migration. Three code changes are needed (one task was already done).

---

## Task Status

| Task | Status |
|------|--------|
| 1. Add localStorage-based dismissed announcements | **TODO** |
| 2. Delete `send-customer-message` edge function | **Already Done** ✅ |
| 3. Remove stale comment in usePosts.ts | **TODO** |
| 4. Remove stale comment in useAttendees.ts | **TODO** |

---

## Implementation Details

### Task 1: localStorage-based Dismissed Announcements

**Files to modify:**

**`src/hooks/useAnnouncements.ts`**
- Add helper functions to read/write dismissed IDs from localStorage
- Add `dismissedIds` state that's populated from localStorage on load
- Filter `announcements` (not `allAnnouncements`) by dismissed IDs
- Add `dismissAnnouncement(id)` function that updates localStorage and state
- Return `dismissAnnouncement` from the hook

```typescript
// Key: 'dismissed_announcements'
// Format: JSON string array of announcement IDs
```

**`src/components/announcements/AnnouncementCard.tsx`**
- Add optional `onDismiss` prop
- Add a close/X button in the top-right corner
- Call `onDismiss(announcement.id)` when clicked

**`src/components/announcements/AnnouncementBanner.tsx`**
- Get `dismissAnnouncement` from useAnnouncements hook
- Pass it to AnnouncementCard as `onDismiss` prop

---

### Task 3: Remove Stale Comment in usePosts.ts

**File:** `src/hooks/usePosts.ts`

**Line 62 (remove):**
```typescript
// Build the base query - using new 'posts' table name (not lms_posts)
```

**Replace with:**
```typescript
// Build the base query
```

---

### Task 4: Remove Stale Comment in useAttendees.ts

**File:** `src/hooks/useAttendees.ts`

**Line 4 (remove entirely):**
```typescript
// Updated interface to match new schema - no more order_id, ticket_type_id, is_purchaser columns
```

The interface definition should immediately follow the imports without any comment.

---

## Technical Notes

### localStorage API for Dismissed Announcements

```typescript
const STORAGE_KEY = 'dismissed_announcements';

// Read dismissed IDs
const getDismissedIds = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Write dismissed IDs
const saveDismissedIds = (ids: string[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
};
```

### AnnouncementCard Dismiss Button Design

- Position: Absolute, top-right corner
- Icon: X from lucide-react
- Size: Small (h-4 w-4)
- Styling: Ghost button, muted color, hover effect
- Only show when `onDismiss` prop is provided (allows reuse in admin view without dismiss)

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAnnouncements.ts` | Add localStorage dismissal logic |
| `src/components/announcements/AnnouncementCard.tsx` | Add dismiss button |
| `src/components/announcements/AnnouncementBanner.tsx` | Pass dismissAnnouncement handler |
| `src/hooks/usePosts.ts` | Remove stale comment (line 62) |
| `src/hooks/useAttendees.ts` | Remove stale comment (line 4) |
