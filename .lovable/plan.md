

# Fix QR Code Scanner Performance and Stability on Mobile

## Problems Identified

After analyzing the code and session replay data, I found several issues causing the scanner to be slow and unstable on mobile:

### Issue 1: Scanner Restarts on Every Dependency Change
The `handleScan` callback is included in the effect dependencies (line 141), which causes the scanner to stop and restart every time the callback reference changes. This creates a jarring experience where the camera briefly disappears.

### Issue 2: Problematic State Update Pattern
On line 82-86 of CheckIn.tsx, there's an incorrect use of `useState` as an effect:
```javascript
useState(() => {
  if (scannedAttendeeId && !loadingAttendee) {
    updateStatusFromAttendee();
  }
});
```
This is meant to be `useEffect`, causing the status update logic to not work properly.

### Issue 3: Race Condition in Status Updates
When a QR code is scanned, the `handleScan` function:
1. Sets `scannedAttendeeId` 
2. Sets `scanStatus` to 'loading'
3. Deactivates the scanner

However, the `updateStatusFromAttendee` callback isn't being called reliably because of the broken `useState` usage, leaving the UI stuck in a loading state or causing the camera box to disappear without any check-in occurring.

### Issue 4: Scanner FPS Too Low for Mobile
The current `fps: 10` setting can feel slow on mobile devices. Increasing to 15-20 fps improves responsiveness without significantly impacting battery.

### Issue 5: Missing Visual Feedback
Users don't get immediate feedback when a QR code is detected - the scanner just disappears.

## Solution

### File 1: `src/components/events/checkin/QRScanner.tsx`

1. **Use `facingMode` instead of camera ID for initial start**
   - Mobile devices respond better to `{ facingMode: "environment" }` than specific camera IDs
   - This also speeds up initial camera acquisition

2. **Stabilize callback reference with useRef**
   - Store the callback in a ref to prevent scanner restarts when the callback reference changes

3. **Increase scanning FPS for mobile**
   - Change from `fps: 10` to `fps: 15` for faster detection

4. **Add visual scan feedback**
   - Add a brief visual flash/pulse when a QR code is detected before the scanner closes

5. **Improve error recovery**
   - Add a retry mechanism if the camera fails to start

### File 2: `src/pages/events/manage/CheckIn.tsx`

1. **Fix the broken `useState` to `useEffect`**
   - Change line 82-86 from `useState(...)` to `useEffect(...)`
   - Add proper dependencies to ensure status updates fire correctly

2. **Improve the state machine logic**
   - Ensure status transitions happen reliably when attendee data loads

3. **Add success vibration feedback on mobile**
   - Use the Vibration API to provide haptic feedback on successful scan

## Technical Changes

### QRScanner.tsx Changes

```typescript
// Add useRef for stable callback reference
const onScanRef = useRef(onScan);
useEffect(() => { onScanRef.current = onScan; }, [onScan]);

// In handleScan, use the ref instead of the prop
const handleScan = useCallback((decodedText: string) => {
  // ... extraction logic ...
  if (attendeeId) {
    lastScanRef.current = decodedText;
    onScanRef.current(attendeeId); // Use ref instead of direct prop
    // ...
  }
}, [extractAttendeeId, onError]); // Remove onScan from dependencies

// Use facingMode for initial camera start
await scannerRef.current.start(
  { facingMode: "environment" }, // Instead of camera ID
  { fps: 15, qrbox: { width: 250, height: 250 } },
  handleScan,
  () => {}
);

// Remove handleScan from the effect dependencies to prevent restarts
}, [isActive, currentCamera, hasPermission]); // handleScan removed
```

### CheckIn.tsx Changes

```typescript
// Fix line 82-86: Change useState to useEffect
useEffect(() => {
  if (scannedAttendeeId && !loadingAttendee) {
    updateStatusFromAttendee();
  }
}, [scannedAttendeeId, loadingAttendee, updateStatusFromAttendee]);

// Remove the inline status check (lines 89-91) as it will be handled by useEffect

// Add haptic feedback in handleScan
const handleScan = useCallback((attendeeId: string) => {
  // Haptic feedback on mobile
  if ('vibrate' in navigator) {
    navigator.vibrate(100);
  }
  setScannedAttendeeId(attendeeId);
  setScanStatus('loading');
  setIsScannerActive(false);
}, []);
```

## Visual Flow After Fix

```text
┌─────────────────────┐
│  Camera Active      │
│  [Scanning...]      │
└─────────────────────┘
         │
         │ QR Code Detected
         │ (vibration feedback)
         ▼
┌─────────────────────┐
│  Loading Card       │
│  "Looking up..."    │
└─────────────────────┘
         │
         │ Attendee Found
         ▼
┌─────────────────────┐
│  Attendee Card      │
│  [Check In] button  │
└─────────────────────┘
```

## Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| Scan detection speed | ~1-2 seconds | ~0.5 seconds |
| Camera restart on scan | Yes (causes flicker) | No |
| Status update reliability | Broken | Reliable |
| Mobile haptic feedback | None | Vibration pulse |

