

# Add Announcement Edit Mode

## Overview

This feature adds the ability for admins to edit existing announcements via a modal dialog. The backend already supports updating all announcement fields through the `updateAnnouncement` function - this change adds the missing frontend UI.

## User Experience

- An **Edit button** (pencil icon) appears next to each announcement in the admin list
- Clicking it opens a **modal dialog** pre-filled with the announcement's current data
- Admins can modify the title, content, expiration date, and active status
- Saving updates the announcement and closes the modal with a success toast

## Implementation

### New Component

**`src/components/announcements/EditAnnouncementDialog.tsx`**

A modal dialog component containing:
- Title input field (pre-filled)
- Content textarea (pre-filled)
- Expiration date picker (pre-filled if set)
- Active status toggle (pre-filled)
- Cancel and Save buttons

### Modified Files

**`src/pages/Announcements.tsx`**

| Change | Description |
|--------|-------------|
| Import EditAnnouncementDialog | Add the new component import |
| Add edit state | Track which announcement is being edited (`editingAnnouncement`) |
| Add Edit button | Pencil icon button next to the active toggle |
| Render dialog | Show EditAnnouncementDialog when an announcement is selected |

## Component Architecture

```text
Announcements Page
       |
       +-- CreateAnnouncementForm (existing)
       |
       +-- Announcement List
       |       |
       |       +-- [For each announcement]
       |               +-- Edit Button (new) --> Opens EditAnnouncementDialog
       |               +-- Active Toggle (existing)
       |               +-- Delete Button (existing)
       |
       +-- EditAnnouncementDialog (new, rendered conditionally)
               |
               +-- Title Input
               +-- Content Textarea  
               +-- Expiration Date Picker
               +-- Active Toggle
               +-- Cancel / Save Buttons
```

## Technical Details

### EditAnnouncementDialog Props

| Prop | Type | Description |
|------|------|-------------|
| `announcement` | `Announcement \| null` | The announcement to edit, or null to close |
| `onClose` | `() => void` | Callback to close the dialog |
| `onSave` | `(id: string, data: UpdateData) => Promise<void>` | Callback to save changes |

### State Management

The dialog manages local form state initialized from the announcement prop:
- `title` - string
- `content` - string  
- `expiresAt` - string (datetime-local format)
- `isActive` - boolean
- `isSubmitting` - boolean (for loading state)

When the announcement prop changes (new announcement selected), the form fields reset to the new values using a `useEffect`.

### UI Patterns

Following existing patterns in the codebase:
- Uses the existing `Dialog` component from `@/components/ui/dialog`
- Same form field styling as `CreateAnnouncementForm`
- Consistent button placement (Cancel left, Save right in footer)
- Loading state on Save button during submission

