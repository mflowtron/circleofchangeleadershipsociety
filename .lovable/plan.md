

# Add Edit Functionality to Event Announcements

## Overview

Add the ability to edit existing event announcements in the Event Announcements management page. This will include a dedicated edit dialog with all announcement fields (title, content, priority, expiration) and integrate with the existing announcement history list.

## What Changes

### User Experience

| Scenario | Before | After |
|----------|--------|-------|
| Editing an announcement | Not possible | Click edit button to open dialog with current values |
| Fixing a typo | Must delete and recreate | Edit in place, save changes |
| Changing priority | Must delete and recreate | Toggle between normal/urgent in edit dialog |
| Updating expiration | Must delete and recreate | Update expiration date in edit dialog |

## Implementation Details

### Files Modified

1. `src/pages/events/manage/EventAnnouncements.tsx`

### Changes

#### 1. Add Edit State Variable

Add state to track which announcement is being edited:

```typescript
const [editingAnnouncement, setEditingAnnouncement] = useState<EventAnnouncementRecord | null>(null);
```

#### 2. Add Update Mutation

Create a mutation to update announcement fields:

```typescript
const updateMutation = useMutation({
  mutationFn: async ({ id, data }: { 
    id: string; 
    data: { 
      title: string; 
      content: string; 
      priority: string; 
      is_active: boolean;
      expires_at: string | null; 
    } 
  }) => {
    const { error } = await supabase
      .from('announcements')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['event-announcements', selectedEventId] });
    toast.success('Announcement updated');
    setEditingAnnouncement(null);
  },
  onError: () => {
    toast.error('Failed to update announcement');
  },
});
```

#### 3. Add Edit Button to Announcement Cards

In the announcement history list, add a Pencil icon button next to the active toggle:

```tsx
import { Pencil } from 'lucide-react';

// In the action buttons section (line ~482)
<Button
  variant="ghost"
  size="icon"
  onClick={() => setEditingAnnouncement(ann)}
>
  <Pencil className="h-4 w-4" />
</Button>
```

#### 4. Create Edit Dialog Component

Add an inline dialog component or create a new file. The dialog will include:

- Title input
- Content textarea (with more rows since content can be long)
- Priority selector (normal/urgent)
- Expiration date input
- Active toggle
- Save/Cancel buttons

The dialog will:
- Open when `editingAnnouncement` is not null
- Pre-populate fields from the selected announcement
- Call `updateMutation` on save
- Close and reset state on cancel or successful save

## UI Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  Edit Announcement                                      [X] │
├─────────────────────────────────────────────────────────────┤
│  Title                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ WiFi Password Update                                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Content                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ The conference WiFi password has been changed...       ││
│  │ ...                                                    ││
│  │ ...                                                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │ Priority        │  │ Expires At (optional)           │   │
│  │ [Normal     ▼]  │  │ [datetime-local picker    ]     │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│                                                             │
│  [ ] Active                                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Changes]       │
└─────────────────────────────────────────────────────────────┘
```

## Announcement Card with Edit Button

```text
┌─────────────────────────────────────────────────────────────┐
│ WiFi Password Update  [active] [urgent] [pushed]           │
│ The conference WiFi password has been...                    │
│ Mar 15, 2026 2:30 PM • 👁 45 views • ✕ 12 dismissed         │
│                                     [✏️] [🔘] [🗑️]          │
└─────────────────────────────────────────────────────────────┘
  (new edit button)  (toggle) (delete)
```

## Technical Notes

- The edit dialog extends the existing pattern from `src/components/announcements/EditAnnouncementDialog.tsx` but adds priority selector
- Uses the same Select component already imported for priority selection in the create form
- Uses React Query's `useMutation` for optimistic caching and automatic refetch
- Push notification content cannot be retroactively edited (push was already sent)

