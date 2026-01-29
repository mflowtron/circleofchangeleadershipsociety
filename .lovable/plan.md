
# Click Outside to Close - Image Lightbox Fix

## Problem
When viewing a photo in fullscreen mode, clicking outside the image doesn't close the lightbox. The current implementation has a hidden div for "click outside to close" functionality, but it:
1. Is hidden on mobile devices (`hidden sm:block`)
2. Has a negative z-index (`-z-10`) making it unreachable

## Solution
Modify the image container to detect clicks on the background area (outside the image) and close the lightbox. This approach works on both mobile and desktop.

## Implementation

**File:** `src/components/ui/image-lightbox.tsx`

1. **Add a click handler to the container div** that checks if the click target is the container itself (not the image)
2. **Remove the old hidden click-outside div** since it's redundant
3. **Ensure clicks on the image don't trigger close** by stopping propagation or checking the target

### Code Changes

Add a new `handleBackgroundClick` handler:
```tsx
const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
  // Only close if clicking directly on the container, not the image
  if (e.target === e.currentTarget) {
    handleClose();
  }
}, [handleClose]);
```

Update the image container div (line 314) to include the click handler:
```tsx
<div 
  ref={imageRef}
  className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
  onWheel={handleWheel}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  onTouchCancel={handleTouchEnd}
  onClick={handleBackgroundClick}  // Add this
>
```

Remove the redundant hidden div (lines 345-349):
```tsx
// DELETE THIS:
{/* Click outside to close on desktop */}
<div 
  className="absolute inset-0 -z-10 hidden sm:block"
  onClick={handleClose}
/>
```

### Behavior
- Clicking anywhere on the dark background (outside the image) will close the lightbox
- Clicking on the image itself will NOT close it (allows for interaction like double-tap zoom)
- Works on both mobile and desktop
- Maintains all existing gesture functionality (pinch zoom, swipe to dismiss, etc.)
