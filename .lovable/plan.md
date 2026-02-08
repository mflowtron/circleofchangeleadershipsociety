

# Add Individual Attendee Search/Selection to Push Notifications

## Overview
Enable the "Individual Attendee(s)" option in the Push Notifications audience selector, allowing organizers to search and select specific attendees for targeted notifications.

---

## Current State

- The `AudienceSelector` shows "Individual Attendee(s)" as disabled with "Coming soon"
- The `AudienceFilter` interface already supports `attendee_ids: string[]`
- The edge function already handles `audience_type: 'individual'` with `attendee_ids` filter
- The `useAudienceCounts` hook fetches attendee `id` and `user_id`, but not names/emails

---

## Changes Required

### 1. Update `useAudienceCounts` Hook

Enhance the hook to fetch attendee names for display in the search:

```typescript
// Add to the attendees mapping
attendees: eventAttendees.map(a => ({
  id: a.id,
  user_id: a.user_id,
  first_name: a.first_name,
  last_name: a.last_name,
  email: a.email,
})),
```

The attendees table already has `first_name`, `last_name`, and `email` fields.

### 2. Create `AttendeeSearchSelector` Component

New component `src/components/events/push/AttendeeSearchSelector.tsx`:

- Multi-select combobox using Command/Popover pattern (like SpeakerSelector)
- Search attendees by name or email
- Display selected attendees as removable chips
- Show avatar with initials, name, and email

```text
┌─────────────────────────────────────────────────────────────────┐
│  Selected:                                                       │
│  ┌──────────────────────────────┐ ┌──────────────────────────┐  │
│  │ [JD] John Doe           [x]  │ │ [JS] Jane Smith     [x]  │  │
│  │     john@example.com         │ │     jane@example.com     │  │
│  └──────────────────────────────┘ └──────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [Search attendees...]                                  ▼  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Dropdown when open:                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [AB] Alice Brown - alice@company.com                      │  │
│  │ [BC] Bob Chen - bob@organization.org                      │  │
│  │ [CD] Carol Davis - carol@business.net                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Update `AudienceSelector` Component

- Enable the "Individual Attendee(s)" radio option (remove `disabled` and opacity)
- Render the `AttendeeSearchSelector` component when `audienceType === 'individual'`
- Pass handlers to manage `audienceFilter.attendee_ids`

### 4. Update `AudienceCounts` Interface

Update the interface to include attendee display information:

```typescript
interface AudienceCounts {
  total: number;
  inPerson: number;
  virtual: number;
  ticketTypes: Array<{ id: string; name: string; count: number }>;
  attendees: Array<{
    id: string;
    user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }>;
}
```

---

## Component Structure

```text
AudienceSelector
├── RadioGroup
│   ├── All Attendees
│   ├── In-Person Only
│   ├── Virtual Only
│   ├── By Ticket Type → [Checkbox list when selected]
│   └── Individual Attendee(s) → [AttendeeSearchSelector when selected]
│
└── AttendeeSearchSelector (new)
    ├── Selected attendees chips
    └── Popover with Command search
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/usePushNotifications.ts` | Modify | Add first_name, last_name, email to attendee selection in useAudienceCounts |
| `src/components/events/push/AttendeeSearchSelector.tsx` | Create | New multi-select search component for attendees |
| `src/components/events/push/AudienceSelector.tsx` | Modify | Enable individual option and integrate AttendeeSearchSelector |

---

## Technical Notes

- Uses existing Command/Popover pattern consistent with SpeakerSelector
- Searches across first_name, last_name, and email fields
- Attendees table already has these fields populated during registration
- Edge function logic for `individual` type already exists and works
- Filter count shows number of selected attendees

---

## UI Interaction Flow

1. Organizer selects "Individual Attendee(s)" radio option
2. Search input and selected chips area appears
3. Organizer types in search field to filter attendees
4. Clicking an attendee adds them to selection
5. Selected attendees appear as chips with remove button
6. Recipient count updates to show selected count
7. On send, `audience_filter.attendee_ids` is populated with selected IDs

