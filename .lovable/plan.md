

# Customize Mux Video Uploader Interface

## Overview

Transform the current basic Mux uploader into a beautiful, on-brand upload experience that matches the app's premium design system. We'll use Mux's subcomponents (`MuxUploaderDrop`, `MuxUploaderFileSelect`, `MuxUploaderProgress`) to create a fully customized interface while keeping the robust upload functionality.

## Current State

The current implementation uses the default `MuxUploader` component with minimal styling:

```jsx
<MuxUploader
  endpoint={videoUploadUrl}
  onSuccess={handleVideoUploadSuccess}
  className="w-full"
/>
```

This shows Mux's default gray/blue UI which doesn't match the app's golden premium aesthetic.

## Proposed Design

Create a custom uploader UI that:
- Uses a dashed border drop zone with the app's primary color
- Shows a video icon and clear instructions
- Displays a custom "Select Video" button styled as a primary action
- Shows upload progress with the app's branded progress bar
- Maintains all Mux functionality (drag & drop, chunked uploads, resumability)

---

## Implementation Approach

### Strategy: Use Mux Subcomponents

Instead of using the monolithic `<MuxUploader>` component, we'll use its subcomponents:
- `MuxUploaderDrop` - Handles drag & drop
- `MuxUploaderFileSelect` - Handles file selection
- `MuxUploaderProgress` - Shows upload progress

These subcomponents connect to a hidden parent `<MuxUploader>` via an `id` reference.

---

## File Changes

### Update `src/components/feed/CreatePostForm.tsx`

**Changes to make:**

1. **Import subcomponents** (line 2):
```tsx
import MuxUploader, { 
  MuxUploaderDrop, 
  MuxUploaderFileSelect, 
  MuxUploaderProgress 
} from '@mux/mux-uploader-react';
```

2. **Add progress tracking state** (around line 40):
```tsx
const [uploadProgress, setUploadProgress] = useState(0);
```

3. **Add progress handler** (around line 148):
```tsx
const handleUploadProgress = (e: CustomEvent) => {
  setUploadProgress(Math.round(e.detail));
};
```

4. **Reset progress on video removal** (in `removeVideo` function):
```tsx
setUploadProgress(0);
```

5. **Replace the current MuxUploader JSX** (lines 334-344) with a custom styled interface:

**New structure:**
```tsx
{videoUploadUrl ? (
  <div className="space-y-4">
    {/* Hidden MuxUploader that powers everything */}
    <MuxUploader
      id="post-video-uploader"
      endpoint={videoUploadUrl}
      onSuccess={handleVideoUploadSuccess}
      onProgress={handleUploadProgress}
      noDrop
      noProgress
      noStatus
      className="hidden"
    />
    
    {/* Custom styled drop zone */}
    <MuxUploaderDrop
      muxUploader="post-video-uploader"
      className="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
        border-border hover:border-primary/50 hover:bg-primary/5
        [&[active]]:border-primary [&[active]]:bg-primary/10"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Video className="h-7 w-7 text-primary" />
        </div>
        
        <div className="space-y-1">
          <p slot="heading" className="font-medium text-foreground">
            Drag and drop your video here
          </p>
          <p slot="separator" className="text-sm text-muted-foreground">
            or
          </p>
        </div>
        
        <MuxUploaderFileSelect muxUploader="post-video-uploader">
          <Button type="button" variant="outline" className="gap-2">
            <FileUp className="h-4 w-4" />
            Select Video
          </Button>
        </MuxUploaderFileSelect>
        
        <p className="text-xs text-muted-foreground mt-2">
          MP4, MOV, MKV, WEBM supported
        </p>
      </div>
    </MuxUploaderDrop>
    
    {/* Upload progress indicator */}
    {uploadProgress > 0 && uploadProgress < 100 && (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Uploading...</span>
          <span className="font-medium text-foreground">{uploadProgress}%</span>
        </div>
        <Progress value={uploadProgress} className="h-2" />
      </div>
    )}
  </div>
) : null}
```

6. **Add import for Progress component** (around line 6):
```tsx
import { Progress } from '@/components/ui/progress';
```

7. **Add import for FileUp icon** (line 14):
Add `FileUp` to the existing lucide-react import.

---

## Visual Comparison

| Aspect | Current | After |
|--------|---------|-------|
| Drop zone | Mux's default gray | Dashed border with primary color on hover/active |
| Icon | Generic upload icon | Video icon in a circular primary-tinted container |
| Button | Blue Mux default | App's outline button with consistent styling |
| Progress | Mux's built-in bar | Custom progress component matching app design |
| Colors | Gray/blue | Warm golden theme matching the app |
| Typography | Mux defaults | App's font with proper hierarchy |

---

## Technical Details

### How Mux Subcomponents Work

The subcomponents connect via the `muxUploader` prop which references the `id` of the parent `<MuxUploader>`:

```text
MuxUploader (id="post-video-uploader")  <-- Powers upload logic
    ↑
    ├── MuxUploaderDrop (muxUploader="post-video-uploader")  <-- Handles drag/drop
    │
    └── MuxUploaderFileSelect (muxUploader="post-video-uploader")  <-- Handles file picker
```

### CSS Attribute Selectors

Mux components add state attributes like `[active]` when a file is being dragged over. We use Tailwind's arbitrary variant syntax to style these states:

```css
[&[active]]:border-primary [&[active]]:bg-primary/10
```

### Progress Tracking

The `onProgress` callback provides upload percentage as `event.detail`:

```tsx
onProgress={(e) => setUploadProgress(Math.round(e.detail))}
```

---

## Files Changed

| File | Action |
|------|--------|
| `src/components/feed/CreatePostForm.tsx` | Add Mux subcomponent imports, progress state, custom styled upload UI |

---

## Result

The video upload dialog will feature:
- A premium-styled drop zone matching the app's design language
- Clear visual feedback when dragging files
- A custom-styled file select button
- A branded progress bar during upload
- All existing Mux functionality preserved (chunked uploads, resume, error handling)

