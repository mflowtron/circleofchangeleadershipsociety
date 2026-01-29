

# Attendee Mobile App Environment

## Overview

Create a dedicated mobile-first experience for event attendees to log in using their email (same OTP flow as the order portal), view their registered events, browse and bookmark agenda items, and display their check-in QR code. This will be a separate experience from the admin/organizer dashboard, focused entirely on the attendee journey.

## Architecture

```text
+------------------+     +-------------------+     +----------------------+
|  Attendee Login  | --> | Attendee Context  | --> | Event Selection      |
|  (Email + OTP)   |     | (Extends Order    |     | (Multi-event aware)  |
+------------------+     | Portal Session)   |     +----------------------+
                         +-------------------+              |
                                                           v
+------------------+     +-------------------+     +----------------------+
|  My QR Code      | <-- | Attendee App      | <-- | Agenda + Bookmarks   |
|  (Per Event)     |     | (Bottom Nav)      |     | (Per Event)          |
+------------------+     +-------------------+     +----------------------+
                                |
                                v
                         +-------------------+
                         | Agenda Bookmarks  |
                         | (Local + DB)      |
                         +-------------------+
```

## Database Design

### New Table: `attendee_bookmarks`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| attendee_id | uuid | FK to attendees table |
| agenda_item_id | uuid | FK to agenda_items table |
| created_at | timestamptz | When bookmark was created |

**Unique constraint:** `(attendee_id, agenda_item_id)` - one bookmark per item per attendee

### RLS Policies
Since attendees authenticate via session tokens (not Supabase Auth), we'll use edge functions to manage bookmarks securely.

## New Files Structure

```
src/
├── pages/
│   └── attendee/
│       ├── Index.tsx          # Login page (reuse order portal auth)
│       ├── Dashboard.tsx      # Main app shell with bottom nav
│       ├── EventHome.tsx      # Selected event overview
│       ├── Agenda.tsx         # Full agenda with bookmark capability
│       ├── MySchedule.tsx     # Bookmarked sessions only
│       └── QRCode.tsx         # Check-in QR code display
│
├── components/
│   └── attendee/
│       ├── AttendeeLayout.tsx       # Mobile-first layout with bottom nav
│       ├── BottomNavigation.tsx     # Tab bar (Home, Agenda, My Schedule, QR)
│       ├── EventSelector.tsx        # For multi-event attendees
│       ├── AgendaItemCard.tsx       # Agenda item with bookmark toggle
│       ├── BookmarkButton.tsx       # Animated bookmark toggle
│       └── QRCodeDisplay.tsx        # Large QR with attendee info
│
├── hooks/
│   └── useAttendeePortal.ts    # Extends useOrderPortal with bookmarks
│   └── useAttendeeBookmarks.ts # Manage agenda bookmarks
│
└── contexts/
    └── AttendeeContext.tsx     # Current event, attendee, bookmarks
```

## New Edge Functions

### `get-attendee-bookmarks`
Fetch bookmarks for an attendee across all their events.

### `toggle-attendee-bookmark`
Add or remove a bookmark for an agenda item.

## UI Design

### Bottom Navigation (Mobile-First)

```text
+--------------------------------------------------+
|                                                  |
|              [EVENT CONTENT AREA]                |
|                                                  |
+--------------------------------------------------+
| [Home]   [Agenda]   [My Schedule]   [QR Code]    |
+--------------------------------------------------+
```

### Home Tab
- Event cover image and title
- Quick stats: "Day 1 of 3", upcoming session
- Next session countdown
- Quick actions: View QR, My Schedule

### Agenda Tab
- Day picker (tabs or swipe)
- Track filter dropdown
- Session cards with bookmark toggle
- Tap to expand for details and speakers

### My Schedule Tab
- Only bookmarked sessions
- Grouped by day
- Empty state with "Browse Agenda" CTA

### QR Code Tab
- Large QR code (centered, prominent)
- Attendee name and ticket type
- Download and share buttons
- "Show this to check in" instruction

## Route Structure

| Route | Component | Description |
|-------|-----------|-------------|
| `/attendee` | Index.tsx | Login (redirect if authenticated) |
| `/attendee/app` | Dashboard.tsx | Main app with bottom nav |
| `/attendee/app/home` | EventHome.tsx | Event overview |
| `/attendee/app/agenda` | Agenda.tsx | Full agenda |
| `/attendee/app/schedule` | MySchedule.tsx | Bookmarked sessions |
| `/attendee/app/qr` | QRCode.tsx | Check-in QR code |

## Implementation Sequence

### Phase 1: Database and Authentication
1. Create `attendee_bookmarks` table with unique constraint
2. Create edge function `get-attendee-bookmarks`
3. Create edge function `toggle-attendee-bookmark`
4. Extend `useOrderPortal` to include attendee-specific data

### Phase 2: Core Components
1. Create `AttendeeContext` for managing selected event and attendee
2. Build `AttendeeLayout` with mobile-optimized header
3. Build `BottomNavigation` component with active state
4. Create `useAttendeeBookmarks` hook

### Phase 3: Pages
1. Build `/attendee` login page (leverage existing OTP flow)
2. Create `Dashboard.tsx` as the app shell
3. Build `EventHome.tsx` with event overview
4. Build `Agenda.tsx` with bookmark functionality
5. Build `MySchedule.tsx` for personal schedule
6. Build `QRCode.tsx` with large QR display

### Phase 4: Polish and PWA
1. Add iOS safe area support
2. Implement pull-to-refresh on agenda
3. Add haptic feedback on bookmark toggle
4. Optimize for offline viewing of bookmarks

## Multi-Event Support

When an attendee has tickets to multiple events:
1. Show event selector on first load
2. Remember last selected event in localStorage
3. Allow switching events from header
4. Bookmarks and QR codes are per-event

## Mobile Optimizations

1. **Safe Areas**: Respect iOS notch and home indicator
2. **Touch Targets**: Minimum 44px for all interactive elements
3. **Swipe Gestures**: Swipe between agenda days
4. **Pull to Refresh**: On agenda and schedule pages
5. **Haptic Feedback**: On bookmark toggle and QR display
6. **Offline Support**: Cache agenda and bookmarks locally
7. **Large QR Code**: Optimized for brightness and scanability

## Technical Details

### Attendee Identification
- Reuse existing order portal session (email + OTP)
- Session stored in localStorage with expiration
- Attendees are linked to orders by email match

### Bookmark Sync Strategy
1. Optimistic UI updates for instant feedback
2. Sync with server on toggle
3. Refresh bookmarks on app resume
4. Handle conflicts gracefully

### QR Code Generation
- Use existing `AttendeeQRCode` component logic
- Encode: `{baseUrl}/events/checkin/{attendeeId}`
- Size optimized for mobile screens (280px)
- High contrast for scanability

## Security Considerations

1. Session validation on every API call
2. Bookmarks scoped to attendee's registered events only
3. QR codes only shown for attendee's own registrations
4. No access to other attendees' data

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/xxx_attendee_bookmarks.sql` | Database table and constraints |
| `supabase/functions/get-attendee-bookmarks/index.ts` | Fetch bookmarks API |
| `supabase/functions/toggle-attendee-bookmark/index.ts` | Toggle bookmark API |
| `src/contexts/AttendeeContext.tsx` | State management for attendee app |
| `src/hooks/useAttendeeBookmarks.ts` | Bookmark management hook |
| `src/components/attendee/AttendeeLayout.tsx` | Mobile layout wrapper |
| `src/components/attendee/BottomNavigation.tsx` | Tab bar component |
| `src/components/attendee/EventSelector.tsx` | Multi-event picker |
| `src/components/attendee/AgendaItemCard.tsx` | Session card with bookmark |
| `src/components/attendee/BookmarkButton.tsx` | Animated bookmark toggle |
| `src/components/attendee/QRCodeDisplay.tsx` | Large QR presentation |
| `src/pages/attendee/Index.tsx` | Login page |
| `src/pages/attendee/Dashboard.tsx` | App shell |
| `src/pages/attendee/EventHome.tsx` | Event overview |
| `src/pages/attendee/Agenda.tsx` | Full agenda view |
| `src/pages/attendee/MySchedule.tsx` | Personal schedule |
| `src/pages/attendee/QRCode.tsx` | QR code page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add attendee routes |
| `src/hooks/useOrderPortal.ts` | Add method to get attendee ID for current user |
| `supabase/functions/get-orders-by-email/index.ts` | Include bookmark data in response |

