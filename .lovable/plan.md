
# Fix Success Message Being Overwritten by "Already Checked In"

## Problem

After a successful check-in, the green success message appears briefly but is immediately replaced by the yellow "already checked in" warning. This creates a confusing user experience.

## Root Cause

When a check-in completes successfully:
1. The status is set to `success`
2. The query cache is invalidated (to update stats and activity feed)
3. This causes the `existingCheckIn` query to refetch
4. Since a check-in record now exists, the `existingCheckIn` query returns data
5. A useEffect hook detects this change and automatically updates the status to `already_checked_in`

The useEffect is designed to update the status when data loads, but it doesn't account for the `success` state which should persist.

## Solution

Modify the `updateStatusFromAttendee` function to skip status updates when the current status is `success`. The success state should be a "terminal" state that only changes when the user clicks "Scan Next".

## Technical Changes

### Update `src/pages/events/manage/CheckIn.tsx`

Add a check at the beginning of `updateStatusFromAttendee` to preserve the success state:

```typescript
const updateStatusFromAttendee = useCallback(() => {
  if (!scannedAttendeeId) return;
  
  // Don't override success state - user must manually proceed to next scan
  if (scanStatus === 'success') return;
  
  if (loadingAttendee) {
    setScanStatus('loading');
    return;
  }
  // ... rest of the function
}, [scannedAttendeeId, loadingAttendee, scannedAttendee, selectedEventId, existingCheckIn, scanStatus]);
```

This ensures:
- The success message remains visible until the user clicks "Scan Next"
- The function still properly handles other state transitions (loading, ready, error, wrong_event)
- Adding `scanStatus` to the dependency array ensures the callback always has the current status value
