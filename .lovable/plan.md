

# Add Video Sound Toggle to Feed

## Overview
Add mute/unmute functionality to video posts in the TikTok-style feed. Users will be able to toggle sound via a dedicated button, and by tapping on the video itself (single tap to toggle sound, double tap for like).

---

## Design Approach

### Sound Toggle Button
Add a sound button in the top-right area (below the content type badge) or in the action buttons column on the right:

```text
┌────────────────────────────────────────┐
│  📌 Pinned              🔴 0:24        │
│                                        │
│                          🔊 ← Sound    │
│                          toggle        │
│                                        │
│                                        │
│           [VIDEO]                      │
│                                        │
│                               ❤️ 247   │
│                               💬 12    │
│                               ↗️ 8     │
│                               🔖 24    │
│                                        │
│  📍 Main Stage                         │
│  👤 Circle of Change @coclc            │
│  Day 1 Recap ✨ What an incredible...  │
└────────────────────────────────────────┘
```

### Interaction Behavior
| Action | Result |
|--------|--------|
| Single tap on video | Toggle mute/unmute |
| Double tap on video | Like + heart animation |
| Tap sound button | Toggle mute/unmute |

### Global Mute State
Sound state should be managed at the feed level (ConferenceFeed) so that:
- When user unmutes one video, it stays unmuted as they scroll
- All videos share the same mute state
- When navigating away and back, state resets to muted

---

## Implementation Details

### 1. Add Global Mute State to ConferenceFeed

```typescript
const [isMuted, setIsMuted] = useState(true);

const handleToggleMute = useCallback(() => {
  setIsMuted(prev => !prev);
}, []);
```

Pass `isMuted` and `onToggleMute` to PostCard components.

### 2. Update PostCard Props & MuxPlayer

```typescript
interface PostCardProps {
  post: PostCardType;
  isActive: boolean;
  isMuted: boolean;           // New prop
  onLike: () => void;
  onBookmark: () => void;
  onToggleMute: () => void;   // New prop
}

// MuxPlayer changes
<MuxPlayer
  ref={muxPlayerRef}
  muted={isMuted}  // Dynamic instead of always true
  // ...rest
/>
```

### 3. Add Sound Toggle Button

Add a 40×40px glass button (matching action buttons style) positioned in the action buttons column or top-right corner:

```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    onToggleMute();
  }}
  className="flex flex-col items-center"
>
  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
    {isMuted ? (
      <VolumeX className="w-5 h-5 text-white" />
    ) : (
      <Volume2 className="w-5 h-5 text-white" />
    )}
  </div>
</button>
```

### 4. Update Tap Behavior

Modify `handleTap` to handle single-tap mute toggle for video posts:

```typescript
const handleTap = useCallback(() => {
  const now = Date.now();
  const timeSinceLastTap = now - lastTap;
  
  if (timeSinceLastTap < 300) {
    // Double tap - trigger like
    if (!post.liked) {
      onLike();
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);
    setLastTap(0); // Reset to prevent triple-tap issues
  } else {
    // Single tap - toggle mute (for video posts)
    if (post.type === 'video' || post.type === 'recap') {
      // Use timeout to wait and see if it's a double-tap
      setTimeout(() => {
        if (Date.now() - now >= 280) {
          onToggleMute();
        }
      }, 300);
    }
  }
  setLastTap(now);
}, [lastTap, post.liked, post.type, onLike, onToggleMute]);
```

### 5. Optional: Mute/Unmute Visual Feedback

Show a brief animated indicator when toggling sound:

```tsx
// State for animation
const [showMuteIndicator, setShowMuteIndicator] = useState(false);

// In the tap handler after toggling mute:
setShowMuteIndicator(true);
setTimeout(() => setShowMuteIndicator(false), 600);

// Visual indicator overlay
{showMuteIndicator && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
    <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center animate-scale-in">
      {isMuted ? (
        <VolumeX className="w-8 h-8 text-white" />
      ) : (
        <Volume2 className="w-8 h-8 text-white" />
      )}
    </div>
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/attendee/feed/ConferenceFeed.tsx` | Add `isMuted` state, pass to PostCard |
| `src/components/attendee/feed/cards/PostCard.tsx` | Add mute button, update tap behavior, add visual feedback |

---

## Technical Notes

### Why Global Mute State?
Users expect that if they unmute one video, the next video they scroll to will also be unmuted. This matches TikTok/Reels behavior where sound preference persists during a session.

### Delayed Single-Tap Detection
To distinguish single-tap (mute toggle) from double-tap (like), we use a 300ms delay. If no second tap occurs within 300ms, we trigger the mute toggle.

### Photo Posts
Single tap does nothing on photo posts since there's no sound. Only double-tap for like is active.

### MuxPlayer Volume
MuxPlayer accepts a `muted` boolean prop. When `muted={false}`, the video plays with sound at the default volume.

---

## UI Polish

- **Button placement**: Sound button goes in the right action column, between the bookmark button and the bottom of the column
- **Icon states**: `VolumeX` when muted, `Volume2` when unmuted
- **Visual feedback**: Brief center-screen icon animation on toggle
- **Transition**: Add smooth transition on mute indicator fade

---

## Summary

| Feature | Implementation |
|---------|----------------|
| Sound toggle button | Glass button in action column with Volume icons |
| Tap to unmute | Single tap on video toggles mute state |
| Double tap to like | Preserved existing behavior |
| Global mute state | Managed in ConferenceFeed, passed to all PostCards |
| Visual feedback | Animated icon overlay on toggle |

