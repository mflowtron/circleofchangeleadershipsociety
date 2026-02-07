
# Fix Bottom Navigation Safe Area Padding

## Problem

The bottom navigation bar in the attendee app is positioned too close to the screen edge, conflicting with the iOS home indicator and Android gesture navigation areas. This makes the bottom icons harder to tap and looks cramped.

## Solution

Add CSS safe area inset padding to the bottom navigation component. This uses the native `env(safe-area-inset-bottom)` CSS function which automatically provides the correct padding on devices with home indicators, notches, or gesture navigation bars.

---

## Visual Before/After

```text
BEFORE:                           AFTER:
┌─────────────────────┐           ┌─────────────────────┐
│  Home  Agenda  ...  │           │  Home  Agenda  ...  │
├─────────────────────┤           ├─────────────────────┤
│   (home indicator)  │           │     (padding)       │
│▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄│           │   (home indicator)  │
└─────────────────────┘           │▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄│
                                  └─────────────────────┘
```

---

## Implementation

### File: `src/components/attendee/BottomNavigation.tsx`

Add safe area padding to the navigation container:

```tsx
// Before (line 20)
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
  <div className="flex items-center justify-around h-16">

// After
<nav 
  className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
>
  <div className="flex items-center justify-around h-16">
```

### File: `src/components/attendee/AttendeeLayout.tsx`

Update main content padding to account for the larger bottom nav:

```tsx
// Before (line 51)
<main className="flex-1 pb-20 overflow-y-auto">

// After - Use calc() to add 64px (h-16) + safe area inset
<main 
  className="flex-1 overflow-y-auto"
  style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}
>
```

---

## Technical Details

| CSS Function | Purpose |
|--------------|---------|
| `env(safe-area-inset-bottom)` | Returns the device's safe area inset for the bottom edge (home indicator, gesture bar) |
| `calc(64px + env(...))` | Combines the nav height (h-16 = 64px) with the safe area for proper content spacing |

### Browser Support
- `env()` is supported in iOS Safari 11.2+, Chrome 69+, all modern browsers
- Falls back to 0 on devices without safe areas (works correctly)
- Already enabled via `viewport-fit=cover` in `index.html` (line 5)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/attendee/BottomNavigation.tsx` | Add `paddingBottom: env(safe-area-inset-bottom)` to nav |
| `src/components/attendee/AttendeeLayout.tsx` | Update main content padding with calc() |

This is a minimal 2-file change that follows the same pattern already used in `MessageInput.tsx` and `Conversation.tsx` for their safe area handling.
