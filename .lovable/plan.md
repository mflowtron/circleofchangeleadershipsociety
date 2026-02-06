

# Add Video Thumbnail Preview to "Video Ready" Box

## Overview

Replace the current "Video ready" text-only indicator with a visually rich preview that includes the actual video thumbnail from Mux. This gives users immediate visual confirmation of which video will be attached to their post.

## Current State

The current "Video ready" box shows:
- A CheckCircle icon
- "Video ready" text
- "Your video will be attached to this post" description
- A remove button

## Proposed Design

Redesign the indicator to feature:
- A thumbnail preview of the uploaded video (from Mux CDN)
- A small play icon overlay on the thumbnail
- The success text and remove button

```text
+------------------------------------------+
|  +--------+                              |
|  |  [▶]   |  Video ready                |  [X]
|  | thumb  |  Your video will be attached |
|  +--------+                              |
+------------------------------------------+
```

---

## Implementation

### Update `src/components/feed/CreatePostForm.tsx` (lines 223-241)

Replace the current simple box with a thumbnail-enhanced version:

**Current code:**
```tsx
{videoPlaybackId && (
  <div className="relative inline-block ml-13">
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
      <CheckCircle className="h-5 w-5 text-primary" />
      <div>
        <p className="text-sm font-medium text-foreground">Video ready</p>
        <p className="text-xs text-muted-foreground">Your video will be attached to this post</p>
      </div>
      <Button ...>
        <X className="h-4 w-4" />
      </Button>
    </div>
  </div>
)}
```

**New code:**
```tsx
{videoPlaybackId && (
  <div className="relative inline-block ml-13">
    <div className="flex items-center gap-3 p-2 pr-3 rounded-xl bg-primary/10 border border-primary/20">
      {/* Video thumbnail preview */}
      <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        <img
          src={`https://image.mux.com/${videoPlaybackId}/thumbnail.png?width=160&height=112&fit_mode=smartcrop`}
          alt="Video preview"
          className="w-full h-full object-cover"
        />
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-3 w-3 text-foreground fill-current ml-0.5" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Video ready</p>
        <p className="text-xs text-muted-foreground">Your video will be attached to this post</p>
      </div>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
        onClick={removeVideo}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  </div>
)}
```

### Add Play icon import (line 14)

Add `Play` to the existing lucide-react import.

---

## Technical Details

### Mux Thumbnail URL

Mux provides automatic thumbnail generation via their image CDN:
- URL format: `https://image.mux.com/{playbackId}/thumbnail.png`
- Query parameters:
  - `width=160` - Thumbnail width (2x for retina)
  - `height=112` - Thumbnail height (2x for retina)  
  - `fit_mode=smartcrop` - Intelligent cropping to focus on content

### Thumbnail Dimensions

- Container: 80px x 56px (5:3.5 aspect ratio, similar to 16:9)
- Image request: 160px x 112px (2x for high-DPI displays)
- `object-cover` ensures the image fills the container without distortion

---

## Visual Comparison

| Aspect | Current | After |
|--------|---------|-------|
| Preview | None (icon only) | Actual video thumbnail |
| Visual feedback | Abstract checkmark | Concrete video preview |
| Play indication | None | Play icon overlay |
| Size | Compact text box | Slightly larger with thumbnail |

---

## Files Changed

| File | Changes |
|------|---------|
| `src/components/feed/CreatePostForm.tsx` | Add Play icon import, replace video ready box with thumbnail preview |

