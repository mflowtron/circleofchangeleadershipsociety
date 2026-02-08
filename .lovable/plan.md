
# Add Dashboard Switch Button to Attendee App

## Overview
When users with access to the LMS or Events dashboards are viewing the Attendee App, show a button that allows them to navigate back to the dashboard selection screen (`/select-dashboard`). This helps organizers and administrators easily switch contexts without logging out and back in.

## Current State
- The `AttendeeLayout` component has a header with a logout button
- The `AuthContext` (wrapping the entire app) provides `hasLMSAccess` and `hasEMAccess` flags
- Both the main auth and attendee auth share the same Supabase session
- The dashboard selector is located at `/select-dashboard`

## Solution
Add a conditional "Switch Dashboard" button to the `AttendeeLayout` header that:
1. Uses `useAuth()` from the main `AuthContext` to check if user has LMS or Events access
2. Only shows the button if the user has access to either LMS or Events (since that means they have multiple dashboards to choose from)
3. Links to `/select-dashboard` to let them choose a different area

---

## Technical Implementation

### File to Modify
`src/components/attendee/AttendeeLayout.tsx`

### Changes

1. **Import `useAuth`** from the main AuthContext
2. **Import `LayoutDashboard`** icon from lucide-react  
3. **Check access** using `hasLMSAccess` or `hasEMAccess` from the auth context
4. **Add button** in the header, positioned before the logout button

### Updated Header Structure

```text
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
├─────────────────────────────────────────────────────────────┤
│  [Title] [EventSelector]           [Dashboard] [Logout]     │
│                                         ↑                   │
│                                  Only visible               │
│                                  if hasLMSAccess            │
│                                  or hasEMAccess             │
└─────────────────────────────────────────────────────────────┘
```

### Code Changes

```tsx
// Add to imports
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';

// Inside AttendeeLayout component
const { hasLMSAccess, hasEMAccess } = useAuth();
const showDashboardSwitch = hasLMSAccess || hasEMAccess;

// In header, before logout button
{showDashboardSwitch && (
  <Button
    variant="ghost"
    size="icon"
    asChild
    aria-label="Switch dashboard"
  >
    <Link to="/select-dashboard">
      <LayoutDashboard className="h-5 w-5" />
    </Link>
  </Button>
)}
```

## Files Modified
| File | Action |
|------|--------|
| `src/components/attendee/AttendeeLayout.tsx` | Add dashboard switch button |

## Edge Cases Handled
- Users without LMS/Events access won't see the button (attendee-only users)
- The button uses a link component for proper navigation
- Uses an icon-only button to keep the header clean and consistent with the existing logout button
