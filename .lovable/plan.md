

# Simplify Feed View Header & Add Create Post Button

## Overview
Remove the header elements (title and camera icon) from the Feed view and add a context-aware "create post" button to the bottom navigation that only appears when on the Feed screen.

---

## Changes Summary

### 1. Remove FeedHeader Component
The `FeedHeader` component currently shows a camera button and "Feed" title. Since we're removing both, we can either:
- Delete the component entirely, OR
- Simplify it to just handle safe area inset at top (for status bar)

Since the feed is full-screen and immersive, we'll keep a minimal version that just provides the top safe area gradient overlay to ensure content doesn't clash with the status bar.

### 2. Add Create Post Button to Bottom Navigation
Add a "+" or "create" button to the center of the bottom navigation that:
- Only appears when on the `/attendee/app/feed` route
- Has a distinct style (e.g., larger, highlighted)
- Triggers a create post action (placeholder for now)

---

## Visual Changes

### Before (Current Header)
```text
┌─────────────────────────────────────┐
│ [📷]           Feed                 │  ← Camera + Title
│                                     │
│           [VIDEO CONTENT]           │
│                                     │
├─────────────────────────────────────┤
│  🏠     📰     📅     💬     📱    │
│  Home  Feed  Agenda Messages  QR    │
└─────────────────────────────────────┘
```

### After (Clean Header + Create Button)
```text
┌─────────────────────────────────────┐
│      (gradient fade for status bar) │  ← Minimal safe area only
│                                     │
│           [VIDEO CONTENT]           │
│                                     │
├─────────────────────────────────────┤
│  🏠   📰   [➕]   💬     📱        │  ← Create button in center
│  Home Feed  +   Messages  QR        │
└─────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/attendee/feed/FeedHeader.tsx` | Remove camera button and title, keep only minimal gradient overlay for safe area |
| `src/components/attendee/BottomNavigation.tsx` | Add conditional "Create Post" button when on feed route |
| `src/components/attendee/feed/ConferenceFeed.tsx` | Pass create post handler to navigation (or use callback) |

---

## Technical Details

### FeedHeader Simplification
```tsx
// Before: Camera + Title + Balance space
// After: Just the gradient overlay for status bar safety

export function FeedHeader() {
  return (
    <div 
      className="fixed top-0 left-0 right-0 z-30 pointer-events-none"
      style={{
        background: 'linear-gradient(to bottom, rgba(9,9,11,0.8) 0%, rgba(9,9,11,0.4) 50%, transparent 100%)',
        height: 'calc(env(safe-area-inset-top) + 20px)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    />
  );
}
```

### BottomNavigation with Create Button
The navigation will detect when on the feed route and render a special center button:

```tsx
const location = useLocation();
const isFeedRoute = location.pathname.includes('/attendee/app/feed');

// In the nav items rendering:
{isFeedRoute && (
  <button 
    onClick={onCreatePost}
    className="flex flex-col items-center justify-center flex-1 h-full gap-1"
  >
    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
      <Plus className="h-5 w-5 text-primary-foreground" />
    </div>
  </button>
)}
```

### Navigation Items Adjustment
When on the feed route, we'll show 5 items with the create button in the middle:
- Home, Feed, **[+]**, Messages, QR

When not on feed route, standard 5 items:
- Home, Feed, Agenda, Messages, QR

This keeps the navigation consistent width but swaps the middle item contextually.

---

## Create Post Handler

For now, the create button will be a placeholder. Options for future implementation:
1. Open a create post dialog/sheet
2. Navigate to a create post screen
3. Open camera for photo/video capture

The button click will initially just log or show a toast indicating "Create post coming soon" or similar placeholder behavior.

---

## Implementation Order

1. Simplify `FeedHeader.tsx` - Remove camera and title, keep minimal gradient
2. Update `BottomNavigation.tsx` - Add conditional create button for feed route
3. Update `ConferenceFeed.tsx` if needed - Pass any handlers to navigation

