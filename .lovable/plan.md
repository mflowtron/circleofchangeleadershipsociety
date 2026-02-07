
# Fix Bookmark Toggle Page Refresh Issue

## Problem
When clicking the bookmark icon to add/remove an agenda item from the schedule, the page refreshes causing a jarring user experience. The optimistic update flickers because a full data refetch happens immediately after.

## Root Cause
In `AttendeeContext.tsx`, the `toggleBookmark` function:
1. Correctly performs an **optimistic update** (immediately updates UI)
2. Calls the API to toggle the bookmark
3. **Always** calls `refreshBookmarks()` after success, which triggers a full network request and state reset

The `refreshBookmarks()` call is unnecessary on success because the optimistic update already has the correct state.

## Solution
Modify `toggleBookmark` to:
1. Keep the optimistic update (immediate UI feedback)
2. On **success**: Trust the optimistic update - do NOT call `refreshBookmarks()`
3. On **error**: Revert the optimistic update by calling `refreshBookmarks()` to sync with server state

This pattern is standard for optimistic UI - only refresh on error to restore correct state.

---

## Technical Changes

### File: `src/contexts/AttendeeContext.tsx`

**Current Code (lines 193-216):**
```typescript
try {
  const { data, error } = await supabase.functions.invoke('toggle-attendee-bookmark', {
    body: { ... },
  });
  
  if (error || !data?.success) {
    // Revert optimistic update
    await refreshBookmarks();
    return { success: false };
  }
  
  // Refresh to get accurate data  <-- PROBLEM: This causes the jarring refresh
  await refreshBookmarks();
  return { success: true };
} catch (err) {
  console.error('Failed to toggle bookmark:', err);
  await refreshBookmarks();
  return { success: false };
}
```

**New Code:**
```typescript
try {
  const { data, error } = await supabase.functions.invoke('toggle-attendee-bookmark', {
    body: { ... },
  });
  
  if (error || !data?.success) {
    // Revert optimistic update on error
    await refreshBookmarks();
    return { success: false };
  }
  
  // Success - trust the optimistic update, no refresh needed
  return { success: true };
} catch (err) {
  console.error('Failed to toggle bookmark:', err);
  // Revert optimistic update on error
  await refreshBookmarks();
  return { success: false };
}
```

---

## Summary

| Scenario | Current Behavior | New Behavior |
|----------|------------------|--------------|
| Success | Optimistic update + full refresh (jarring) | Optimistic update only (smooth) |
| Error | Refresh to revert | Refresh to revert (same) |

This is a one-line change: remove line 210 (`await refreshBookmarks();`) from the success path.
