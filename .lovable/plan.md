
# Fix: Mux Player Fullscreen Exit Content Shift

## Problem Identified

When exiting fullscreen mode in the Mux video player on iOS (within the Natively wrapper), the page content shifts down and displays a large gap at the top. This is visible in your screenshot where there's significant empty space between the header and the "Back to Recordings" button.

**Root Cause:** This is a known iOS Safari/WebView bug. When a video enters fullscreen mode, iOS takes control of the viewport. Upon exit, the browser fails to properly restore the scroll position and viewport state, causing the content to appear shifted.

---

## Solution

Create a custom hook that listens for fullscreen exit events and restores the scroll position. The fix involves:

1. Saving the scroll position before fullscreen begins
2. Restoring it immediately after fullscreen ends
3. Using iOS-specific event names (`webkitbeginfullscreen` / `webkitendfullscreen`)

---

## Implementation Details

### 1. Create Fullscreen Fix Hook

**File:** `src/hooks/useFullscreenScrollFix.ts`

This hook will:
- Attach event listeners to the video element inside MuxPlayer
- Save scroll position when entering fullscreen
- Restore scroll position when exiting fullscreen
- Use both standard and webkit-prefixed events for maximum compatibility

```text
Logic flow:
1. Get reference to MuxPlayer's internal video element
2. Listen for 'webkitbeginfullscreen' → save window.scrollY
3. Listen for 'webkitendfullscreen' → restore scroll position using scrollTo(0, savedPosition)
4. Also handle standard 'fullscreenchange' for non-iOS browsers
5. Cleanup listeners on unmount
```

### 2. Integrate Into RecordingPlayerView

**File:** `src/components/recordings/RecordingPlayerView.tsx`

Call the new hook, passing the player ref so it can attach listeners to the video element.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useFullscreenScrollFix.ts` | Create | Hook to fix iOS fullscreen scroll issue |
| `src/components/recordings/RecordingPlayerView.tsx` | Update | Integrate the fullscreen scroll fix hook |

---

## Technical Details

### iOS-Specific Events

iOS Safari uses proprietary events for fullscreen video:
- `webkitbeginfullscreen` - fired when video enters fullscreen
- `webkitendfullscreen` - fired when video exits fullscreen

These are different from the standard `fullscreenchange` event and are specific to iOS.

### Hook Implementation

```text
export function useFullscreenScrollFix(playerRef: React.RefObject<MuxPlayerElement | null>) {
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    // Get the native video element from MuxPlayer
    const videoEl = playerRef.current?.media?.nativeEl;
    if (!videoEl) return;

    const handleFullscreenStart = () => {
      // Save current scroll position before entering fullscreen
      scrollPositionRef.current = window.scrollY;
    };

    const handleFullscreenEnd = () => {
      // Restore scroll position after exiting fullscreen
      // Use requestAnimationFrame to ensure DOM has settled
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
      });
    };

    // iOS-specific events
    videoEl.addEventListener('webkitbeginfullscreen', handleFullscreenStart);
    videoEl.addEventListener('webkitendfullscreen', handleFullscreenEnd);

    // Standard fullscreen event (for other browsers)
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        handleFullscreenEnd();
      } else {
        handleFullscreenStart();
      }
    });

    return () => {
      videoEl.removeEventListener('webkitbeginfullscreen', handleFullscreenStart);
      videoEl.removeEventListener('webkitendfullscreen', handleFullscreenEnd);
    };
  }, [playerRef]);
}
```

### Integration in RecordingPlayerView

```text
// In RecordingPlayerView.tsx
import { useFullscreenScrollFix } from '@/hooks/useFullscreenScrollFix';

// After playerRef declaration
useFullscreenScrollFix(playerRef);
```

---

## Alternative Approach

If the scroll restoration alone doesn't fully solve the issue (some iOS versions have additional viewport quirks), an additional fix can be added:

```text
const handleFullscreenEnd = () => {
  // Force viewport recalculation
  document.body.style.height = '100.1%';
  requestAnimationFrame(() => {
    document.body.style.height = '';
    window.scrollTo(0, scrollPositionRef.current);
  });
};
```

---

## Testing Considerations

After implementation:
1. Open the Recordings page in the Natively iOS wrapper
2. Select a recording to open the player view
3. Tap the fullscreen button on the Mux player
4. Exit fullscreen using the iOS done/minimize button
5. Verify content is not shifted down
6. Verify scroll position is preserved
7. Test on web browser to ensure no regressions
