

# Build Conference Attendee TikTok-Style Feed

## Overview
Create a full-screen vertical scroll feed for the conference attendee mobile app with **blocking interstitial cards** that prevent scrolling until user interaction. The feed uses Mux for video playback, custom snap-scroll mechanics, and an immersive dark theme.

---

## Architecture Decision

### Location in App
The feed will be added as a new tab in the attendee app navigation, accessible at `/attendee/app/feed`. This integrates naturally with the existing attendee experience while being a standalone immersive feature.

### Data Strategy
All content is hardcoded dummy data with real Mux playback IDs for working video. State is managed locally with React `useState`/`useReducer`. No database changes required.

---

## File Structure

```text
src/
  pages/attendee/
    Feed.tsx                        # Main feed page (route component)
  components/attendee/feed/
    ConferenceFeed.tsx              # Scroll container + blocking logic
    cards/
      PostCard.tsx                  # Regular post (video/photo)
      AnnouncementCard.tsx          # Blocking announcement
      PollCard.tsx                  # Blocking poll
      VideoAskCard.tsx              # Blocking video feedback
    FeedHeader.tsx                  # Tab switcher + corner buttons
    FeedBottomNav.tsx               # Custom bottom nav for feed
    ScrollDots.tsx                  # Right-edge position indicators
    ScrollLockIndicator.tsx         # Floating lock pill
    EndOfFeedCard.tsx               # "All caught up" final card
    HeartBurstAnimation.tsx         # Double-tap like animation
  data/
    conferenceFeedData.ts           # Dummy feed items array
  types/
    conferenceFeed.ts               # TypeScript interfaces
```

---

## Implementation Phases

### Phase 1: Core Types & Data

**File: `src/types/conferenceFeed.ts`**

Define TypeScript interfaces for all 4 card types:
- `PostCard` (video/photo/recap content)
- `AnnouncementCard` (blocking, requires acknowledge)
- `PollCard` (blocking, requires vote)
- `VideoAskCard` (blocking, requires record/skip)
- Union type `FeedItem`

**File: `src/data/conferenceFeedData.ts`**

Create hardcoded array of 12 feed items matching the exact sequence in the requirements, using real Mux playback IDs.

---

### Phase 2: Feed Container & Blocking Logic

**File: `src/components/attendee/feed/ConferenceFeed.tsx`**

Core container implementing:

1. **Scroll Snap Container**
   ```css
   scroll-snap-type: y mandatory;
   overflow-y: scroll;
   height: 100%;
   ```

2. **Active Card Tracking**
   - `IntersectionObserver` with `threshold: 0.6` to detect visible card
   - Track `activeIndex` state

3. **Blocking Mechanic**
   - On scroll event, check if active card is unresolved interstitial
   - If blocked, snap `scrollTop` back to `activeIndex * containerHeight`
   - Show floating lock indicator when blocked

4. **Auto-Advance After Interaction**
   - When interstitial is resolved, wait 600ms
   - Smooth scroll to next card with `scrollTo({ behavior: "smooth" })`

5. **State Management**
   - `useReducer` for feed items state
   - Actions: `ACKNOWLEDGE_ANNOUNCEMENT`, `VOTE_POLL`, `RESPOND_VIDEOASK`, `TOGGLE_LIKE`, `TOGGLE_BOOKMARK`

---

### Phase 3: Post Card

**File: `src/components/attendee/feed/cards/PostCard.tsx`**

Full-screen immersive card with:

1. **Media Layer**
   - Video: Full-bleed `<MuxPlayer>` with autoplay when visible
   - Photo: Full-bleed image (picsum.photos placeholder)
   - Bottom gradient overlay (55% from bottom)

2. **Content Overlay (bottom-aligned)**
   - Location/session tag (colored pill)
   - User row (avatar, name, handle, optional OFFICIAL badge)
   - Caption (3-line clamp, text-shadow)
   - Timestamp row (date + relative time)

3. **Action Buttons (right column)**
   - Like toggle with count
   - Comment count
   - Share count  
   - Bookmark toggle with count
   - 40×40px glass circles

4. **Top Badges**
   - Video: Red dot + duration
   - Photo: Camera icon badge
   - AI Recap: Gold gradient badge
   - Pinned: Top-left pin badge (first card only)

5. **Interactions**
   - Double-tap → heart burst animation + toggle like
   - Single tap on buttons → optimistic state update
   - Video autoplay/pause based on visibility

---

### Phase 4: Announcement Card

**File: `src/components/attendee/feed/cards/AnnouncementCard.tsx`**

Blocking interstitial with:

1. **Background**
   - Pure dark `#09090b`
   - Radial glow at 30% from top (accent color at 15% opacity)
   - Subtle scanline texture

2. **Content (centered, max-width 340px)**
   - Large emoji icon (72×72px rounded square)
   - Priority badge (red for important, blue for info)
   - Title (22px, weight 900)
   - Body (14px, muted color)
   - Source + time
   - "Got it ✓" button (full-width, gradient background)
   - Lock hint text

3. **Slide-up entrance animation**

4. **State**: `acknowledged: boolean` → unblocks scroll when true

---

### Phase 5: Poll Card

**File: `src/components/attendee/feed/cards/PollCard.tsx`**

Blocking poll with:

1. **Same background treatment as announcements**

2. **Content (centered, max-width 360px)**
   - "📊 Quick Poll" badge
   - Question text (21px, weight 900)
   - Options list (vertical buttons)
     - Before vote: option text + emoji, checkmark on hover
     - After vote: animated fill bars + percentages

3. **Vote Flow**
   - Tap option → set selected, 300ms delay
   - Submit → show animated results (800ms bar transition)
   - 1200ms delay → unblock scroll

4. **State**: `selectedOption`, `submitted` → unblocks when submitted

---

### Phase 6: VideoAsk Card

**File: `src/components/attendee/feed/cards/VideoAskCard.tsx`**

Blocking video feedback with:

1. **Same background treatment**

2. **Content (centered, max-width 340px)**
   - "🎥 Video Feedback" badge
   - Camera preview placeholder (square, dark background)
   - Prompt question (19px, weight 900)
   - Subtitle explanation
   - Action buttons: "Record" + "Skip"

3. **Recording Flow (UI prototype only)**
   - Tap "Record" → 3-2-1 countdown overlay
   - During recording: red border, REC indicator, timer
   - Tap "Stop" → success state, 1500ms delay, unblock
   - Tap "Skip" → immediately unblock

4. **State**: `recording`, `countdown`, `recorded` → unblocks when recorded or skipped

---

### Phase 7: UI Components

**FeedHeader.tsx**
- Fixed position, z-30
- Tab switcher: Following | Latest | Trending
- Camera button (top-left)
- Search button (top-right)
- Gradient fade background

**FeedBottomNav.tsx**
- Custom 5-item nav for feed context
- Feed (active), Discover, Create (+), Schedule, Profile
- Create button: amber gradient, no label

**ScrollDots.tsx**
- Vertical dots on right edge
- Regular posts: small white dots
- Interstitials: larger accent-colored dots
- Active card: elongated dot

**ScrollLockIndicator.tsx**
- Floating pill when blocked
- Red glass morphism background
- "🔒 Scroll locked — interact to continue"
- Slide-up entrance animation

**EndOfFeedCard.tsx**
- "You're all caught up!" message
- "Share a moment" CTA button

**HeartBurstAnimation.tsx**
- Large heart at center of card
- Scale up + fade out over 800ms

---

### Phase 8: Routing & Integration

**Update: `src/App.tsx`**
- Add route: `/attendee/app/feed` → `AttendeeFeed`
- Lazy load the feed page

**Update: `src/components/attendee/BottomNavigation.tsx`**
- Add Feed tab to the navigation
- Use appropriate icon (Newspaper or similar)

**Update: `src/pages/attendee/Dashboard.tsx`**
- Add preload for feed page
- Handle full-screen feed view (no layout wrapper needed)

---

### Phase 9: Styling

**Update: `src/index.css`**

Add custom keyframes:
```css
@keyframes heartBurst {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
  15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
  30% { transform: translate(-50%, -50%) scale(0.95); }
  45% { transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -60%) scale(1.2); }
}

@keyframes slideUp { ... }
@keyframes pulse { ... }
```

Add feed-specific CSS variables for the dark theme:
```css
.feed-dark {
  --feed-bg: #09090b;
  --feed-card: #111114;
  --feed-border: #1e1e24;
  --feed-text-primary: #f0f0f2;
  --feed-text-secondary: #a1a1aa;
  /* Accent colors per type */
}
```

---

## Key Technical Notes

### Scroll Blocking Implementation
```typescript
const handleScroll = useCallback(() => {
  if (!containerRef.current) return;
  
  const currentItem = feedItems[activeIndex];
  const isBlocked = isBlockingCard(currentItem) && !isResolved(currentItem);
  
  if (isBlocked) {
    const targetScrollTop = activeIndex * containerHeight;
    containerRef.current.scrollTop = targetScrollTop;
  }
}, [activeIndex, feedItems, containerHeight]);
```

### Video Autoplay Control
```typescript
useEffect(() => {
  if (isActive && muxPlayerRef.current) {
    muxPlayerRef.current.play();
  } else if (muxPlayerRef.current) {
    muxPlayerRef.current.pause();
  }
}, [isActive]);
```

### Double-Tap Detection
```typescript
const handleTap = useCallback(() => {
  const now = Date.now();
  if (now - lastTap < 300) {
    // Double tap - trigger like
    setShowHeartBurst(true);
    onLike();
  }
  setLastTap(now);
}, [lastTap, onLike]);
```

---

## Design Specifications

| Property | Value |
|----------|-------|
| Background | `#09090b` |
| Card surfaces | `#111114` |
| Borders | `#1e1e24` |
| Primary text | `#f0f0f2` |
| Secondary text | `#a1a1aa` |
| Announcement accent | `#3b82f6` (blue) |
| Poll accent | `#8b5cf6` (purple) |
| VideoAsk accent | `#ef4444` (red) |
| AI Recap accent | `#f59e0b` (amber) |
| Container | 390×760px (mobile-first) |
| Font headings | Figtree (400-900) |
| Font metadata | Instrument Sans (400-700) |

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/conferenceFeed.ts` | Create | TypeScript interfaces for all card types |
| `src/data/conferenceFeedData.ts` | Create | Hardcoded 12-item feed array |
| `src/pages/attendee/Feed.tsx` | Create | Main feed page component |
| `src/components/attendee/feed/ConferenceFeed.tsx` | Create | Scroll container with blocking logic |
| `src/components/attendee/feed/cards/PostCard.tsx` | Create | Full-screen post card |
| `src/components/attendee/feed/cards/AnnouncementCard.tsx` | Create | Blocking announcement |
| `src/components/attendee/feed/cards/PollCard.tsx` | Create | Blocking poll |
| `src/components/attendee/feed/cards/VideoAskCard.tsx` | Create | Blocking video feedback |
| `src/components/attendee/feed/FeedHeader.tsx` | Create | Tab switcher + buttons |
| `src/components/attendee/feed/FeedBottomNav.tsx` | Create | Custom feed bottom nav |
| `src/components/attendee/feed/ScrollDots.tsx` | Create | Position indicators |
| `src/components/attendee/feed/ScrollLockIndicator.tsx` | Create | Floating lock pill |
| `src/components/attendee/feed/EndOfFeedCard.tsx` | Create | "All caught up" card |
| `src/components/attendee/feed/HeartBurstAnimation.tsx` | Create | Like animation |
| `src/App.tsx` | Modify | Add feed route |
| `src/components/attendee/BottomNavigation.tsx` | Modify | Add Feed tab |
| `src/pages/attendee/Dashboard.tsx` | Modify | Preload + handle feed view |
| `src/index.css` | Modify | Add feed animations + CSS variables |
| `index.html` | Modify | Add Google Fonts (Figtree, Instrument Sans) |

---

## Mux Playback IDs (Ready to Use)

| Playback ID | Use For |
|-------------|---------|
| `a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M` | Post video 1 (AI Recap) |
| `EcHgOK9coz5K4rjSwOkoE7Y7O01201YMIC200RI6lNxnhs` | Post video 2 (Mixer) |
| `DS00Spx1CV902MCtPj5WknGlR102V5HFkDe` | Post video 3 (AI breakout) |
| `VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA` | Post video 4 (Panel) |
| `OYWW4ZbsI93B00vrQkMCc7nhNJ9Hb011qyjGjZElC01Zz8` | Post video 5 (Keynote) |

Mux Player is already installed (`@mux/mux-player-react` version `^3.10.2`).

---

## User Experience Flow

1. User opens attendee app and taps "Feed" in bottom nav
2. Full-screen dark feed loads with immersive video/photo cards
3. User swipes up to scroll through content
4. When reaching a blocking interstitial (announcement/poll/videoask):
   - Scroll is locked
   - Floating "🔒 Scroll locked" pill appears
   - User must interact (acknowledge/vote/record/skip)
5. After interaction, auto-scrolls to next card
6. Videos autoplay (muted) when visible
7. Double-tap on posts triggers heart burst animation + like
8. Reaching end shows "All caught up" card with CTA

