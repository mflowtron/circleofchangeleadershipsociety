
# Recording Player Revamp Plan

## Overview
Transform the current recordings page into a rich, focused video player experience with enhanced content, dedicated "play mode" view, and file attachments for admins.

## Current State
- Simple grid view with inline player card when a video is selected
- Basic title and description display
- Grid of other recordings remains visible during playback
- No file attachment capability
- Minimal metadata display

## Proposed Changes

### 1. Dedicated Full-Screen Player Mode
When a user clicks on a recording, the entire page transforms into a focused player view:
- Full-width video player at the top
- No distracting grid of other videos
- Clear "Back to Recordings" navigation
- Clean, theater-like experience

### 2. Rich Recording Details Panel
Below the player, show comprehensive recording information:
- Large title with formatted upload date
- Full multi-paragraph description with proper formatting
- "Uploaded by" with uploader name (pulled from profiles)
- Duration indicator (when available from Mux)

### 3. File Attachments System (Admin Feature)
Allow admins to attach downloadable resources to recordings:
- PDF handouts, slides, worksheets, etc.
- Display as a clean list with file icons
- Download buttons for each attachment
- Upload interface in admin mode

### 4. Browse View Improvements
When not in player mode:
- Cleaner card layout with better thumbnails
- Video duration badges on thumbnails
- Search/filter functionality
- Improved hover states

---

## Technical Implementation

### Database Changes
Create a new `recording_resources` table to store file attachments:

```text
Table: recording_resources
------------------------------
id              UUID (PK)
recording_id    UUID (FK -> recordings)
name            TEXT (display name)
file_url        TEXT (storage URL)
file_type       TEXT (pdf, docx, etc.)
file_size       INTEGER (bytes)
uploaded_by     UUID
created_at      TIMESTAMP
```

Create a new storage bucket `recording-resources` for file uploads.

### Component Structure
Split the page into clear modes:

```text
Recordings.tsx (container)
├── RecordingsBrowseView (grid of videos)
│   └── RecordingCard (individual video card)
└── RecordingPlayerView (full player mode)
    ├── MuxPlayer (video)
    ├── RecordingDetails (title, description, metadata)
    ├── RecordingResources (file attachments list)
    └── ResourceUploadDialog (admin only)
```

### Key Features by Role

**All Users:**
- Browse recordings grid
- Full-screen player mode
- Download attached resources
- View rich descriptions

**Admins/Advisors:**
- Upload new recordings (existing)
- Attach file resources
- Delete resources
- Edit recording details

**Admin Only:**
- Delete recordings (existing)

---

## User Experience Flow

```text
┌─────────────────────────────────────────────┐
│  Lecture Recordings     [Upload Recording]  │
├─────────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐                  │
│  │ ▶   │  │ ▶   │  │ ▶   │   Grid of        │
│  │thumb│  │thumb│  │thumb│   Recording      │
│  ├─────┤  ├─────┤  ├─────┤   Cards          │
│  │Title│  │Title│  │Title│                  │
│  └─────┘  └─────┘  └─────┘                  │
└─────────────────────────────────────────────┘
                    │
                    │ Click recording
                    ▼
┌─────────────────────────────────────────────┐
│  ← Back to Recordings                       │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │         VIDEO PLAYER                │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Recording Title Here                       │
│  Uploaded Jan 15, 2026 by John Smith        │
│                                             │
│  Full description text here with proper     │
│  formatting and multiple paragraphs...      │
│                                             │
│  ─────────────────────────────────────────  │
│  Resources                                  │
│  📄 Lecture Slides.pdf        [Download]    │
│  📄 Worksheet.docx            [Download]    │
│  [+ Add Resource] (admin only)              │
└─────────────────────────────────────────────┘
```

---

## Files to Create/Modify

### New Files
1. `src/components/recordings/RecordingsBrowseView.tsx` - Grid view component
2. `src/components/recordings/RecordingCard.tsx` - Individual card component
3. `src/components/recordings/RecordingPlayerView.tsx` - Full player mode
4. `src/components/recordings/RecordingDetails.tsx` - Title, description, metadata
5. `src/components/recordings/RecordingResources.tsx` - File attachments list
6. `src/components/recordings/ResourceUploadDialog.tsx` - Admin upload dialog
7. `src/hooks/useRecordingResources.ts` - Hook for managing resources

### Modified Files
1. `src/pages/Recordings.tsx` - Refactor to use new components

### Database Migration
1. Create `recording_resources` table
2. Create `recording-resources` storage bucket
3. RLS policies for resources table and bucket
4. Realtime enabled for resources

---

## Summary
This revamp transforms the recordings page from a simple video list into a rich learning resource center. The dedicated player mode eliminates distractions, the enhanced details provide better context, and file attachments enable comprehensive lesson materials.
