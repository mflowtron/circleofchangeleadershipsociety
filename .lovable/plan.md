
# Plan: Add Recording Reordering for Admins

## Overview

This feature allows admins to change the display order of recordings on the Recordings page. The implementation will add a `sort_order` column to the database and provide an intuitive interface with both drag-and-drop and button-based reordering.

## User Experience

**For Admins:**
1. A new "Reorder" button appears next to "Upload Recording"
2. Clicking it enters reorder mode where:
   - Each recording card shows drag handles and up/down arrow buttons
   - Cards can be dragged to reorder
   - Changes are saved automatically as you reorder
3. Click "Done" to exit reorder mode

**For Non-Admins:**
- Recordings appear in the admin-defined order (no reorder controls visible)

---

## Implementation Steps

### Step 1: Database Schema Update

Add a `sort_order` column to the recordings table:

```sql
ALTER TABLE recordings ADD COLUMN sort_order integer DEFAULT 0;

-- Backfill existing recordings with order based on created_at
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM recordings
)
UPDATE recordings 
SET sort_order = ordered.rn
FROM ordered 
WHERE recordings.id = ordered.id;
```

This ensures existing recordings get a logical order based on when they were uploaded.

---

### Step 2: Install Drag-and-Drop Library

Add `@dnd-kit/core` and `@dnd-kit/sortable` packages:

These provide accessible, performant drag-and-drop with built-in keyboard support and screen reader announcements.

---

### Step 3: Update Recordings Query

Modify `fetchRecordings` in `Recordings.tsx` to order by `sort_order` instead of `created_at`:

```typescript
const { data, error } = await supabase
  .from('recordings')
  .select('*')
  .in('status', ['ready', 'preparing'])
  .order('sort_order', { ascending: true });
```

---

### Step 4: Create Reorderable Recording Card Component

Create `SortableRecordingCard.tsx` that wraps `RecordingCard` with drag-and-drop functionality:

**Features:**
- Drag handle (grip icon) on the left side
- Up/Down arrow buttons for keyboard/button-based reordering
- Visual feedback when dragging (opacity, shadow)
- Only shows reorder controls when in reorder mode

---

### Step 5: Update RecordingsBrowseView

Modify to support reorder mode:

**New Props:**
- `isReorderMode: boolean`
- `canReorder: boolean` (admin-only)
- `onReorder: (fromIndex: number, toIndex: number) => void`

**Reorder Mode Layout:**
```text
┌─────────────────────────────────────────────────────┐
│ ≡  [Recording Card]                    [↑] [↓]     │
│ ≡  [Recording Card]    ← dragging      [↑] [↓]     │
│ ≡  [Recording Card]                    [↑] [↓]     │
└─────────────────────────────────────────────────────┘
```

---

### Step 6: Add Reorder Mode Toggle in Recordings.tsx

Add state and UI for reorder mode:

```typescript
const [isReorderMode, setIsReorderMode] = useState(false);
const canReorder = role === 'admin';
```

**Header UI when admin:**
```text
[Upload Recording]  [Reorder] / [Done]
```

---

### Step 7: Implement Reorder Save Logic

When recordings are reordered:

1. Update local state immediately for instant UI feedback
2. Batch update `sort_order` values in Supabase
3. Show toast on success/error

```typescript
const handleReorder = async (fromIndex: number, toIndex: number) => {
  // Reorder local array
  const newOrder = [...recordings];
  const [moved] = newOrder.splice(fromIndex, 1);
  newOrder.splice(toIndex, 0, moved);
  setRecordings(newOrder);
  
  // Update sort_order for all affected items
  const updates = newOrder.map((rec, idx) => ({
    id: rec.id,
    sort_order: idx
  }));
  
  // Batch update via Supabase
  for (const update of updates) {
    await supabase
      .from('recordings')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id);
  }
};
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `recordings` table | Migration | Add `sort_order` column with backfill |
| `package.json` | Modify | Add `@dnd-kit/core` and `@dnd-kit/sortable` |
| `src/pages/Recordings.tsx` | Modify | Add reorder mode state, toggle button, save logic |
| `src/components/recordings/RecordingsBrowseView.tsx` | Modify | Add reorder mode support with DnD context |
| `src/components/recordings/SortableRecordingCard.tsx` | New | Draggable wrapper with reorder controls |
| `src/components/recordings/RecordingCard.tsx` | Modify | Add `sort_order` to Recording interface, accept reorder props |

---

## Technical Details

### DnD-Kit Integration

```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
  <SortableContext items={recordings.map(r => r.id)} strategy={rectSortingStrategy}>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {recordings.map((recording, index) => (
        <SortableRecordingCard
          key={recording.id}
          recording={recording}
          index={index}
          isReorderMode={isReorderMode}
          onMoveUp={() => handleMove(index, index - 1)}
          onMoveDown={() => handleMove(index, index + 1)}
          // ... other props
        />
      ))}
    </div>
  </SortableContext>
</DndContext>
```

### Accessibility Considerations

- Up/Down buttons work without drag-and-drop for keyboard users
- DnD-kit provides built-in keyboard navigation (Space to grab, arrows to move)
- Screen reader announcements for drag operations
- Focus management when entering/exiting reorder mode

---

## Visual States

**Normal Mode (Grid View):**
Recording cards appear as they do now, ordered by `sort_order`

**Reorder Mode (Grid View):**
- Subtle border/highlight around the entire grid
- Each card shows:
  - Grip handle on left (drag affordance)
  - Up/Down buttons (alternative to dragging)
- Header shows "Done" button instead of "Reorder"
- Clicking a card does NOT open the player (navigation disabled)

**While Dragging:**
- Dragged card has increased shadow and slight scale
- Drop placeholder shows where card will land
- Other cards animate to make space
