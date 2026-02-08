

# Show Dashboard Switch Button Across All Areas

## Problem
The "Switch Dashboard" button should appear in all areas (LMS, Events, Attendee) when a user has access to 2 or more of the 3 areas. Currently:
- **Attendee App**: Shows button when `hasLMSAccess || hasEMAccess` (correct)
- **LMS Sidebar**: Shows button only when `hasEMAccess` (incomplete)
- **Events Sidebar**: Shows button only when `hasLMSAccess` (incomplete)

Since the Attendee App is always accessible to all users, anyone with LMS or Events access automatically has 2+ areas available.

## Solution
Update the logic in both the LMS and Events dashboards to consider all three areas when deciding whether to show the switch button.

---

## Technical Details

### Changes to LMS Sidebar (`src/components/layout/Sidebar.tsx`)

**Current logic (line 152):**
```tsx
{hasEMAccess && <Button ...>Switch Dashboard</Button>}
```

**New logic:**
```tsx
const { hasLMSAccess, hasEMAccess, hasAttendeeAccess } = useAuth();
// Show switch button if user has access to another area besides LMS
// Since we're IN the LMS, check if they have Events or Attendee access
const showSwitchOption = hasEMAccess || hasAttendeeAccess;
```

Since `hasAttendeeAccess` is effectively always true for authenticated users, this simplifies to always showing the button for LMS users. However, we should use the proper check for correctness.

### Changes to Events Dashboard Layout (`src/layouts/EventsDashboardLayout.tsx`)

**Current logic (line 35):**
```tsx
showSwitchOption={hasLMSAccess}
```

**New logic:**
```tsx
const { hasLMSAccess, hasAttendeeAccess } = useAuth();
// Show switch button if user has access to another area besides Events
const showSwitchOption = hasLMSAccess || hasAttendeeAccess;
```

### Attendee Layout (Already Correct)
The `AttendeeLayout.tsx` already has the correct logic:
```tsx
const showDashboardSwitch = hasLMSAccess || hasEMAccess;
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Add `hasAttendeeAccess` check alongside `hasEMAccess` |
| `src/layouts/EventsDashboardLayout.tsx` | Add `hasAttendeeAccess` check alongside `hasLMSAccess` |

## Behavior After Changes

| Current Area | Shows Switch Button When |
|--------------|-------------------------|
| LMS | User has Events OR Attendee access |
| Events | User has LMS OR Attendee access |
| Attendee | User has LMS OR Events access |

Since Attendee access is universal, this effectively means:
- LMS users always see the switch button
- Events users always see the switch button  
- Attendee-only users (no LMS/Events) do NOT see the button

