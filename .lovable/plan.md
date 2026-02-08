
# Add Profile Dropdown to Events Dashboard Header

## Overview
Replace the simple logout button in the Events Dashboard header with the same profile dropdown component used in the LMS header, providing a consistent user experience across both modules.

---

## Current State vs Desired State

| Current (Events) | Desired (Like LMS) |
|------------------|-------------------|
| Plain name text | Avatar with ring styling |
| Simple logout button | Full dropdown menu |
| No role display | Role badge (Organizer, Admin, etc.) |
| No profile link | View Profile link |

---

## Changes

### File: `src/components/events/EventsDashboardHeader.tsx`

**Add imports:**
- `Avatar`, `AvatarFallback`, `AvatarImage` from UI components
- `DropdownMenu` components
- `Link` from react-router-dom
- `User`, `ChevronDown` icons from lucide-react

**Add role label logic:**
```typescript
const getRoleLabel = () => {
  if (isEMAdmin) return 'Admin';
  if (isEMManager) return 'Organizer';
  return 'Staff';
};
```

**Replace the header content** with:
- Avatar with initials fallback and primary ring styling
- Name and role displayed beside avatar (hidden on mobile)
- Dropdown menu with:
  - User info header
  - "View Profile" link → `/lms/profile` (shared profile page)
  - Sign Out option with destructive styling

---

## Visual Result

```text
┌──────────────────────────────────────────────────────┐
│  [☰]                     Events     [🌙] [👤 Name ▼] │
│                                           Organizer  │
│                                                      │
│                          Dropdown:                   │
│                          ┌─────────────────┐         │
│                          │ Michael Flotron │         │
│                          │ Organizer       │         │
│                          ├─────────────────┤         │
│                          │ 👤 View Profile │         │
│                          ├─────────────────┤         │
│                          │ 🚪 Sign Out     │         │
│                          └─────────────────┘         │
└──────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/events/EventsDashboardHeader.tsx` | Replace logout button with full dropdown menu matching LMS Header pattern |

---

## Technical Notes

- Uses the same `useAuth` hook which already provides `isEMAdmin` and `isEMManager` for role checks
- Profile link points to `/lms/profile` since profiles are shared across modules
- Maintains existing mobile menu button and theme toggle functionality
- Consistent styling with LMS header (ring-primary/20, rounded-xl button, etc.)
