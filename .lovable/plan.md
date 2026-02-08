

# Clean Up Feed Interface

## Overview
Remove unused features and integrate the standard attendee bottom navigation to maintain consistency across the app.

---

## Changes Summary

### 1. Replace Custom Bottom Nav with Standard Navigation
Currently, `FeedBottomNav.tsx` has non-functional buttons (Discover, Create, Schedule, Profile). Replace this with the existing `BottomNavigation` component that actually navigates to real pages.

**Current (FeedBottomNav)**: Static buttons with no routing
**After (BottomNavigation)**: Real navigation to Home, Feed, Agenda, Messages, QR

### 2. Simplify Feed Header
Remove the tab switcher (Following, Latest, Trending) and the search icon since these aren't functional. Keep only the camera button as a placeholder for future use.

**Current FeedHeader**:
```text
[Camera]  Following | Latest | Trending  [Search]
```

**After**:
```text
[Camera]           Feed           (empty space)
```

The header will show just a centered "Feed" title with the camera button on the left, maintaining the dark immersive gradient style.

### 3. Remove Bookmark Feature from PostCard
Remove the bookmark action button from the right column of post cards. This includes:
- Removing the bookmark button UI
- Removing the `onBookmark` prop from PostCard
- Removing the bookmark-related state and reducer action

### 4. Clean Up Related Code
- Remove `TOGGLE_BOOKMARK` action from the reducer
- Remove `bookmarked` and `bookmarks` fields from type definitions
- Remove bookmark data from dummy feed items
- Delete the `FeedBottomNav.tsx` file (no longer needed)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/attendee/feed/ConferenceFeed.tsx` | Replace `FeedBottomNav` with `BottomNavigation`, remove bookmark handler |
| `src/components/attendee/feed/FeedHeader.tsx` | Remove tabs and search, add centered "Feed" title |
| `src/components/attendee/feed/cards/PostCard.tsx` | Remove bookmark button, remove `onBookmark` prop |
| `src/types/conferenceFeed.ts` | Remove `bookmarked`, `bookmarks` from PostCard, remove `TOGGLE_BOOKMARK` action |
| `src/data/conferenceFeedData.ts` | Remove `bookmarked` and `bookmarks` from all post items |

## File to Delete

| File | Reason |
|------|--------|
| `src/components/attendee/feed/FeedBottomNav.tsx` | Replaced by standard BottomNavigation |

---

## Visual Changes

### Before
```text
┌─────────────────────────────────────────┐
│ [📷]  Following | Latest | Trending [🔍]│  ← Tab switcher + search
│                                         │
│           [VIDEO CONTENT]               │
│                                         │
│                               🔊        │
│                               ❤️ 247    │
│                               💬 12     │
│                               ↗️ 8      │
│                               🔖 24     │  ← Bookmark button
│                                         │
│  📍 Main Stage                          │
│  👤 Circle of Change                    │
│  Day 1 Recap ✨                         │
├─────────────────────────────────────────┤
│  🏠     🔍     ➕     📋     👤          │  ← Non-functional nav
│  Feed  Discover  +  Schedule Profile    │
└─────────────────────────────────────────┘
```

### After
```text
┌─────────────────────────────────────────┐
│ [📷]           Feed                     │  ← Simplified header
│                                         │
│           [VIDEO CONTENT]               │
│                                         │
│                               🔊        │
│                               ❤️ 247    │
│                               💬 12     │
│                               ↗️ 8      │  ← Bookmark removed
│                                         │
│  📍 Main Stage                          │
│  👤 Circle of Change                    │
│  Day 1 Recap ✨                         │
├─────────────────────────────────────────┤
│  🏠     📰     📅     💬     📱        │  ← Real app navigation
│  Home  Feed  Agenda Messages  QR        │
└─────────────────────────────────────────┘
```

---

## Technical Details

### BottomNavigation Integration
The standard `BottomNavigation` component needs to work within the immersive dark feed context. Since the feed uses a fixed dark background, the navigation will need a slight style adjustment to blend better with the dark theme while maintaining its functionality.

The navigation styling will be applied via a wrapper or inline style override to use a dark gradient background similar to what `FeedBottomNav` had, while keeping all the routing logic intact.

### PostCard Props Change
```typescript
// Before
interface PostCardProps {
  post: PostCardType;
  isActive: boolean;
  isMuted: boolean;
  onLike: () => void;
  onBookmark: () => void;  // Remove
  onToggleMute: () => void;
}

// After
interface PostCardProps {
  post: PostCardType;
  isActive: boolean;
  isMuted: boolean;
  onLike: () => void;
  onToggleMute: () => void;
}
```

### Type Changes
```typescript
// Remove from PostCard interface:
bookmarks: number;
bookmarked: boolean;

// Remove from FeedAction type:
| { type: "TOGGLE_BOOKMARK"; id: string }
```

---

## Implementation Order

1. Update `FeedHeader.tsx` - Remove tabs and search, add centered title
2. Update `PostCard.tsx` - Remove bookmark button and prop
3. Update `ConferenceFeed.tsx` - Replace FeedBottomNav with BottomNavigation, remove bookmark handler
4. Update `src/types/conferenceFeed.ts` - Remove bookmark-related types
5. Update `src/data/conferenceFeedData.ts` - Remove bookmark fields from data
6. Delete `FeedBottomNav.tsx` - No longer needed

