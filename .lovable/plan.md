
# QR Code Attendee Check-in System

## Overview

This plan implements a robust QR code scanning system for event organizers to check in attendees at events. The system will track check-ins per day, supporting multi-day events where attendees may need to check in each day.

## Architecture

```text
+------------------+     +-------------------+     +------------------+
|  QR Scanner UI   | --> | Check-in Logic    | --> | attendee_checkins|
|  (Camera/Manual) |     | (Validate + Save) |     | (Database Table) |
+------------------+     +-------------------+     +------------------+
        |                         |
        v                         v
+------------------+     +-------------------+
| html5-qrcode     |     | Real-time Stats   |
| (Browser Camera) |     | (Today's count)   |
+------------------+     +-------------------+
```

## Database Design

### New Table: `attendee_checkins`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| attendee_id | uuid | FK to attendees table |
| event_id | uuid | FK to events table (denormalized for easy querying) |
| check_in_date | date | The date of check-in (not datetime - one per day) |
| checked_in_at | timestamptz | Exact time of check-in |
| checked_in_by | uuid | FK to user who performed check-in |
| notes | text | Optional notes (e.g., "manual check-in") |
| created_at | timestamptz | Record creation time |

**Unique constraint:** `(attendee_id, check_in_date)` - prevents duplicate check-ins on the same day

### RLS Policies
- SELECT: Event owners and admins can view check-ins for their events
- INSERT: Event owners and admins can create check-ins
- UPDATE: Event owners and admins can update check-ins (for notes)
- DELETE: Event owners and admins can undo check-ins

## QR Code Format

The QR code will encode the attendee's unique ID as a URL for easy sharing and fallback:

```
https://[domain]/events/checkin/{attendee_id}
```

This format allows:
- Organizers to scan using the in-app scanner
- Attendees to click the link to view their registration
- Future: deep linking to the check-in page

## New Files

### 1. `src/pages/events/manage/CheckIn.tsx`
Main check-in page with:
- QR scanner component (full-screen camera view)
- Manual search fallback (by name/email/order number)
- Today's check-in stats
- Recent check-in activity feed

### 2. `src/components/events/checkin/QRScanner.tsx`
Wrapper component for html5-qrcode library:
- Camera selection (front/back)
- Start/stop controls
- Visual feedback on successful/failed scan
- Error handling for camera permissions

### 3. `src/components/events/checkin/CheckInResult.tsx`
Displays scan result with:
- Attendee details (name, email, ticket type)
- Check-in status (already checked in today? first time?)
- Confirm/Cancel buttons
- Success/error animations

### 4. `src/components/events/checkin/ManualCheckIn.tsx`
Search interface for manual check-in:
- Search by name, email, or order number
- List of matching attendees
- Quick check-in buttons

### 5. `src/components/events/checkin/CheckInStats.tsx`
Dashboard showing:
- Total attendees for event
- Checked in today count
- Percentage progress bar
- Quick breakdown by ticket type

### 6. `src/components/events/checkin/AttendeeQRCode.tsx`
Component to display/download attendee QR codes:
- Used in order confirmation emails
- Downloadable from order portal
- Printable format

### 7. `src/hooks/useCheckins.ts`
React Query hooks for:
- `useEventCheckins(eventId, date)` - Get all check-ins for an event on a date
- `useAttendeeCheckins(attendeeId)` - Get all check-ins for an attendee
- `useCheckIn()` - Mutation to check in an attendee
- `useUndoCheckIn()` - Mutation to undo a check-in
- `useCheckInStats(eventId, date)` - Get check-in statistics

## UI/UX Flow

### Check-In Page Layout

```text
+------------------------------------------------+
|  <- Back    Check-In    [Stats] [Manual]       |
+------------------------------------------------+
|                                                |
|  +------------------------------------------+  |
|  |                                          |  |
|  |           CAMERA VIEWFINDER              |  |
|  |                                          |  |
|  |    [Scanning QR codes...]                |  |
|  |                                          |  |
|  +------------------------------------------+  |
|                                                |
|  [Switch Camera]              [Enter Manually] |
|                                                |
|  -- Today's Activity --                        |
|  [x] John Doe checked in at 9:15 AM            |
|  [x] Jane Smith checked in at 9:12 AM          |
|  ...                                           |
+------------------------------------------------+
```

### Success State (After Scan)

```text
+------------------------------------------------+
|                                                |
|             [CHECK MARK ANIMATION]             |
|                                                |
|              John Doe                          |
|          General Admission                     |
|         Order #ORD-20260129-0001               |
|                                                |
|           CHECKED IN!                          |
|           9:15 AM                              |
|                                                |
|         [Scan Next]  [View Details]            |
|                                                |
+------------------------------------------------+
```

### Already Checked In State

```text
+------------------------------------------------+
|                                                |
|            [WARNING ICON]                      |
|                                                |
|              John Doe                          |
|          Already checked in today              |
|             at 9:15 AM                         |
|                                                |
|     [Continue Anyway]  [Scan Different]        |
|                                                |
+------------------------------------------------+
```

## Navigation Integration

### Sidebar Addition (`EventsDashboardSidebar.tsx`)

Add new nav item when event is selected:
```typescript
{ path: '/events/manage/checkin', label: 'Check-In', icon: ScanLine }
```

### Route Addition (`App.tsx`)

```typescript
<Route 
  path="/events/manage/checkin" 
  element={
    <ProtectedRoute allowedRoles={['admin', 'event_organizer']} useEventsLayout>
      <CheckIn />
    </ProtectedRoute>
  } 
/>
```

## Dependencies

### New Package: `html5-qrcode`

This is the most reliable browser-based QR scanning library:
- Works on mobile and desktop
- Handles camera permissions
- Supports multiple camera sources
- No native dependencies

## Implementation Sequence

1. **Database Migration**
   - Create `attendee_checkins` table
   - Add RLS policies
   - Enable realtime for live updates

2. **Core Hooks**
   - Create `useCheckins.ts` with all check-in operations
   - Add attendee lookup by ID function

3. **Scanner Components**
   - Build QRScanner component with html5-qrcode
   - Add CheckInResult component for feedback
   - Create ManualCheckIn search interface

4. **Main Check-In Page**
   - Build CheckIn page layout
   - Integrate scanner and manual check-in
   - Add stats dashboard

5. **Navigation & Routing**
   - Add route to App.tsx
   - Add sidebar navigation item

6. **QR Code Generation**
   - Add QR code display to order portal
   - Include in attendee badge data

## Multi-Day Event Support

For events spanning multiple days:
- Check-ins are tracked per date, not just once
- Organizers can select which day they're checking in for (defaults to today)
- Historical check-in data is preserved for reporting
- Stats show progress for the selected day

## Error Handling

| Scenario | Response |
|----------|----------|
| Camera not available | Show manual check-in option prominently |
| Invalid QR code | "Invalid code - not an attendee QR" message |
| Attendee not found | "No attendee found with this ID" |
| Already checked in | Show warning with option to view details |
| Network error | Queue check-in locally, sync when online |
| Wrong event | "This attendee is for a different event" |

## Future Enhancements (Not in Scope)

- Offline mode with local queue
- Bulk check-in via CSV upload
- Check-out tracking for sessions
- Push notifications to organizers
- Attendee self-check-in kiosk mode
