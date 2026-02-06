

# Refactor CreatePostForm.tsx - Extract Video Components

## Overview

Extract the video upload dialog and video ready preview into separate reusable components. This improves code organization, maintainability, and makes each component easier to test and modify independently.

## Current State

`CreatePostForm.tsx` is 440 lines and contains:
- Main post form logic
- Image upload handling
- Video upload state management
- Video upload dialog UI (80+ lines)
- Video ready preview UI (35+ lines)

## Proposed Structure

```text
src/components/feed/
  CreatePostForm.tsx         (main form, reduced to ~200 lines)
  VideoUploadDialog.tsx      (new - upload dialog component)
  VideoReadyPreview.tsx      (new - thumbnail preview component)
```

---

## New Components

### 1. VideoReadyPreview.tsx

A simple presentational component that displays the video thumbnail with play overlay and remove button.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| playbackId | string | Mux playback ID for thumbnail |
| onRemove | () => void | Callback when remove button clicked |

**Contents:** Lines 223-257 from current file

---

### 2. VideoUploadDialog.tsx

A self-contained dialog component that handles the entire video upload flow.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| open | boolean | Dialog open state |
| onOpenChange | (open: boolean) => void | Dialog state change handler |
| onVideoReady | (playbackId: string) => void | Callback when video is processed |
| onRemoveImage | () => void | Clear any selected image when video upload starts |

**Internal State:**
- uploadUrl, uploadId (from Mux)
- status: 'idle' | 'preparing' | 'uploading' | 'uploaded' | 'processing' | 'ready'
- uploadProgress

**Key behavior:**
- Fetches upload URL from mux-upload edge function on open
- Manages MuxUploader and progress states
- Polls for video readiness after upload
- Calls onVideoReady with playbackId when done

**Contents:** Lines 334-437 from current file, plus related state/functions

---

## Refactored CreatePostForm.tsx

After extraction, the main form component will:
- Import and use VideoReadyPreview and VideoUploadDialog
- Manage only the essential video state: `videoPlaybackId` and `isVideoProcessing`
- Delegate all upload complexity to VideoUploadDialog

**Simplified state:**
```tsx
const [videoPlaybackId, setVideoPlaybackId] = useState<string | null>(null);
const [videoDialogOpen, setVideoDialogOpen] = useState(false);
const [isVideoProcessing, setIsVideoProcessing] = useState(false);
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/feed/VideoReadyPreview.tsx` | Create | Thumbnail preview with play overlay and remove button |
| `src/components/feed/VideoUploadDialog.tsx` | Create | Complete upload dialog with Mux integration |
| `src/components/feed/CreatePostForm.tsx` | Update | Import new components, remove extracted code, simplify state |

---

## Technical Notes

### State Communication

```text
CreatePostForm
    |
    +-- videoDialogOpen -----> VideoUploadDialog
    |                              |
    +-- onVideoReady <------------ + (playbackId)
    |                              |
    +-- onProcessingChange <------ + (boolean)
    |
    +-- videoPlaybackId -----> VideoReadyPreview
    |                              |
    +-- onRemove <---------------- +
```

### VideoUploadDialog Lifecycle

1. Parent sets `open={true}`
2. Dialog fetches upload URL (preparing state)
3. User drops/selects video (uploading state)
4. Upload completes (uploaded state, 1.5s)
5. Processing begins, polling starts (processing state)
6. Video ready - calls `onVideoReady(playbackId)`, dialog closes

### Toast Notifications

The VideoUploadDialog will need access to the toast hook for showing upload/processing notifications. It will import and use `useToast` directly.

