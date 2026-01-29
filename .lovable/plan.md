

# Extensive Agenda System for Event Management

## Overview

This plan creates a complete agenda/schedule management system for events, allowing event organizers to build detailed session schedules with speakers, breaks, and miscellaneous items like lunch or networking.

## Database Design

### New Tables

**1. `speakers` table** - Stores speaker profiles that can be reused across sessions

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique identifier |
| event_id | uuid (FK) | Reference to the event |
| name | text | Speaker's full name |
| title | text | Job title/role |
| company | text | Organization name |
| bio | text | Speaker biography |
| photo_url | text | Profile photo URL |
| linkedin_url | text | LinkedIn profile |
| twitter_url | text | Twitter/X handle |
| website_url | text | Personal website |
| sort_order | integer | Display ordering |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**2. `agenda_items` table** - Stores individual agenda entries

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique identifier |
| event_id | uuid (FK) | Reference to the event |
| title | text | Session/item title |
| description | text | Detailed description |
| item_type | text | Type: 'session', 'break', 'meal', 'networking', 'other' |
| starts_at | timestamptz | Start time |
| ends_at | timestamptz | End time |
| location | text | Room/venue location |
| track | text | For multi-track events (e.g., "Main Stage", "Workshop Room") |
| sort_order | integer | Manual sort order within time slots |
| is_highlighted | boolean | Featured/keynote sessions |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**3. `agenda_item_speakers` table** - Links speakers to agenda items (many-to-many)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique identifier |
| agenda_item_id | uuid (FK) | Reference to agenda item |
| speaker_id | uuid (FK) | Reference to speaker |
| role | text | Speaker's role in session: 'speaker', 'moderator', 'panelist' |
| sort_order | integer | Order of speakers in session |
| created_at | timestamptz | Creation timestamp |

### RLS Policies

- Speakers and agenda items visible with published events (same pattern as ticket_types)
- Event owner and admins can create/update/delete

---

## UI Components

### 1. Speakers Management Page

**Route:** `/events/manage/:id/speakers`

Features:
- Grid/list of speakers with photos
- Add new speaker dialog with photo upload
- Edit/delete speaker functionality
- Drag-and-drop reordering

### 2. Agenda Builder Page

**Route:** `/events/manage/:id/agenda`

Features:
- Timeline/list view of all agenda items
- Visual day separator for multi-day events
- Color-coded item types (sessions, breaks, meals)
- Quick-add buttons for different item types
- Inline time editing
- Drag-and-drop reordering

### 3. Agenda Item Form (Dialog)

Fields:
- Title (required)
- Item type dropdown (Session, Break, Meal, Networking, Other)
- Start/end time pickers
- Description (rich text area)
- Location/room
- Track (for parallel sessions)
- Highlight toggle (for keynotes)
- Speaker assignment (multi-select, only for session type)
- Speaker roles (speaker, moderator, panelist)

### 4. Speaker Form (Dialog)

Fields:
- Name (required)
- Photo upload
- Title/role
- Company/organization
- Bio
- Social links (LinkedIn, Twitter, Website)

### 5. Public Agenda View

On the event detail page (`/events/:slug`):
- New "Agenda" section showing the full schedule
- Collapsible day sections
- Session cards with speaker info
- Filter by track (if multi-track)
- Visual distinction for different item types

---

## File Structure

```text
src/
  hooks/
    useAgendaItems.ts       # CRUD hook for agenda items
    useSpeakers.ts          # CRUD hook for speakers
  components/
    events/
      agenda/
        AgendaBuilder.tsx        # Main agenda management UI
        AgendaItemCard.tsx       # Card display for agenda item
        AgendaItemForm.tsx       # Create/edit dialog
        AgendaTimeline.tsx       # Timeline visualization
        AgendaPublicView.tsx     # Public-facing agenda display
        SpeakerCard.tsx          # Speaker display card
        SpeakerForm.tsx          # Create/edit speaker dialog
        SpeakerSelector.tsx      # Multi-select for assigning speakers
        AgendaTypeIcon.tsx       # Icons for different item types
  pages/
    events/
      manage/
        Agenda.tsx               # Agenda management page
        Speakers.tsx             # Speakers management page
```

---

## Implementation Steps

### Phase 1: Database Setup

1. Create `speakers` table with all columns
2. Create `agenda_items` table with all columns
3. Create `agenda_item_speakers` junction table
4. Add RLS policies matching the ticket_types pattern
5. Add indexes for event_id and sort_order

### Phase 2: Backend Hooks

1. Create `useSpeakers.ts` hook
   - Fetch speakers by event ID
   - Create, update, delete speakers
   - Reorder functionality

2. Create `useAgendaItems.ts` hook
   - Fetch agenda items with speakers (joined query)
   - Create, update, delete items
   - Manage speaker assignments
   - Reorder functionality

### Phase 3: Speaker Management UI

1. Create `SpeakerCard.tsx` component
2. Create `SpeakerForm.tsx` dialog
3. Create `Speakers.tsx` management page
4. Add route to App.tsx
5. Add navigation link to sidebar

### Phase 4: Agenda Builder UI

1. Create `AgendaTypeIcon.tsx` component
2. Create `AgendaItemCard.tsx` component
3. Create `SpeakerSelector.tsx` multi-select
4. Create `AgendaItemForm.tsx` dialog
5. Create `AgendaTimeline.tsx` visualization
6. Create `AgendaBuilder.tsx` main component
7. Create `Agenda.tsx` management page
8. Add route to App.tsx
9. Add navigation link to sidebar

### Phase 5: Public Agenda Display

1. Create `AgendaPublicView.tsx` component
2. Integrate into EventDetail.tsx page
3. Style for mobile responsiveness

---

## Technical Details

### Speaker Photo Storage

Use the existing `event-images` storage bucket for speaker photos with path pattern:
`speakers/{event_id}/{speaker_id}.{ext}`

### Agenda Item Types

```typescript
type AgendaItemType = 'session' | 'break' | 'meal' | 'networking' | 'other';

const ITEM_TYPE_CONFIG = {
  session: { label: 'Session', icon: Presentation, color: 'bg-blue-500' },
  break: { label: 'Break', icon: Coffee, color: 'bg-gray-400' },
  meal: { label: 'Meal', icon: Utensils, color: 'bg-orange-500' },
  networking: { label: 'Networking', icon: Users, color: 'bg-green-500' },
  other: { label: 'Other', icon: Calendar, color: 'bg-purple-500' },
};
```

### Speaker Roles in Sessions

```typescript
type SpeakerRole = 'speaker' | 'moderator' | 'panelist';
```

### Sidebar Navigation Update

Add to `EventsDashboardSidebar.tsx`:
- "Speakers" link with UserCircle icon
- "Agenda" link with CalendarDays icon

Both only visible when an event is selected.

---

## User Experience Flow

1. **Create Speakers First** - Organizer adds all speakers with their bios and photos
2. **Build Agenda** - Add sessions, breaks, meals in chronological order
3. **Assign Speakers** - Link speakers to their sessions with roles
4. **Reorder as Needed** - Drag and drop to adjust order
5. **Preview** - View public agenda before publishing

