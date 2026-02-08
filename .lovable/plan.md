

# Hide Cancelled Push Notifications from History

## Overview

Improve the push notification cancellation experience by hiding cancelled notifications from the history list (soft delete behavior) while keeping them in the database for audit purposes. The current implementation marks notifications as "cancelled" but still displays them, which creates confusion about whether the cancellation was successful.

## What Changes

### User Experience

| Scenario | Before | After |
|----------|--------|-------|
| After cancelling | Notification remains visible with "Cancelled" badge | Notification disappears from the list |
| Cancellation feedback | Generic "Notification cancelled" toast | Clear toast confirming notification will not be sent |
| History view | Shows all notifications including cancelled | Shows only actionable history (sent, failed, scheduled) |

## Implementation Details

### Files Modified

1. `src/hooks/usePushNotifications.ts`
2. `src/components/events/push/NotificationHistory.tsx`

### Changes

#### 1. Filter Cancelled Notifications from Query

In `usePushNotifications.ts`, update the query to exclude cancelled notifications:

```typescript
// Current query (line 50-54):
const { data, error } = await supabase
  .from('push_notifications')
  .select('*')
  .eq('event_id', eventId)
  .order('created_at', { ascending: false });

// Updated query - add filter:
const { data, error } = await supabase
  .from('push_notifications')
  .select('*')
  .eq('event_id', eventId)
  .neq('status', 'cancelled')  // Hide cancelled notifications
  .order('created_at', { ascending: false });
```

#### 2. Improve Cancellation Feedback

Update the `cancelNotification` function to provide clearer feedback:

```typescript
// Current toast:
toast.success('Notification cancelled');

// Updated toast - more descriptive:
toast.success('Scheduled notification cancelled — it will not be sent');
```

#### 3. Add Optimistic UI Update (Optional Enhancement)

To make the cancellation feel more immediate, remove the notification from the list optimistically before the server responds:

```typescript
const cancelNotification = useCallback(
  async (notificationId: string) => {
    setIsCancelling(true);
    
    // Optimistic update: immediately remove from cache
    queryClient.setQueryData(
      ['push-notifications', eventId],
      (old: PushNotification[] | undefined) => 
        old?.filter(n => n.id !== notificationId) ?? []
    );
    
    try {
      const { error } = await supabase
        .from('push_notifications')
        .update({ status: 'cancelled' })
        .eq('id', notificationId)
        .eq('status', 'scheduled');

      if (error) throw error;
      
      toast.success('Scheduled notification cancelled — it will not be sent');
    } catch (error) {
      // Revert optimistic update on failure
      queryClient.invalidateQueries({ queryKey: ['push-notifications', eventId] });
      console.error('Failed to cancel notification:', error);
      toast.error('Failed to cancel notification');
    } finally {
      setIsCancelling(false);
    }
  },
  [eventId, queryClient]
);
```

#### 4. Update AlertDialog Confirmation Text

In `NotificationHistory.tsx`, update the confirmation dialog text to be clearer:

```typescript
// Current:
<AlertDialogDescription>
  This notification will not be sent. This action cannot be undone.
</AlertDialogDescription>

// Updated - clearer about what happens:
<AlertDialogDescription>
  This scheduled notification will be cancelled and will not be sent to attendees.
  It will be removed from this list.
</AlertDialogDescription>
```

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/usePushNotifications.ts` | Add `.neq('status', 'cancelled')` filter to query |
| `src/hooks/usePushNotifications.ts` | Add optimistic UI update for immediate feedback |
| `src/hooks/usePushNotifications.ts` | Improve success toast message |
| `src/components/events/push/NotificationHistory.tsx` | Update confirmation dialog description |

## Technical Notes

- **Soft Delete**: The notification remains in the database with `status = 'cancelled'` for audit purposes
- **Optimistic Update**: The notification disappears immediately from the UI, making the action feel responsive
- **Rollback**: If the server request fails, the list is refreshed to restore the notification
- **No Database Changes**: This is purely a frontend filtering change

