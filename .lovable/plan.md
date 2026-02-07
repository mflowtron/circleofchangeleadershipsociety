
# Fix App Header to Respect Mobile Safe Area

## Problem

The main app header in `src/components/layout/Header.tsx` is appearing behind the iOS status bar/notch area. Looking at the screenshot, the header content (hamburger menu, avatar) is overlapping with the system time and battery indicators.

The header currently uses `sticky top-0` positioning but doesn't account for the safe area inset at the top of the screen on devices with notches or Dynamic Islands.

## Analysis

Looking at how other components in the codebase handle safe areas:

| Component | Implementation |
|-----------|----------------|
| `BottomNavigation.tsx` | `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` |
| `AttendeeLayout.tsx` | `style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}` |
| `MessageInput.tsx` | `style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}` |
| `Conversation.tsx` | `style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}` |
| `sonner.tsx` | `mobileOffset={{ top: 'env(safe-area-inset-top)' }}` |

The EventsDashboardHeader uses `pt-safe` which is not a valid Tailwind utility (not defined anywhere in the config), so it's not actually working either.

## Solution

Add `paddingTop: 'env(safe-area-inset-top)'` as an inline style to the Header component, matching the pattern used elsewhere in the app. This will push the header content below the status bar on devices with notches.

---

## Files to Modify

### File 1: `src/components/layout/Header.tsx`

**Line 37** - Add inline style for safe area inset to the header element:

| Before | After |
|--------|-------|
| `<header className="sticky top-0 z-30 floating-header px-4 md:px-6 py-3 flex items-center justify-between">` | `<header className="sticky top-0 z-30 floating-header px-4 md:px-6 py-3 flex items-center justify-between" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>` |

Using `max(0.75rem, env(safe-area-inset-top))` ensures:
- On devices with safe areas: uses the safe area inset value
- On devices/browsers without safe areas: maintains the existing 12px (0.75rem) equivalent padding from `py-3`

### File 2: `src/components/events/EventsDashboardHeader.tsx`

**Line 14** - Fix the non-working `pt-safe` class by replacing with proper inline style:

| Before | After |
|--------|-------|
| `<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-safe">` | `<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" style={{ paddingTop: 'env(safe-area-inset-top)' }}>` |

---

## Technical Details

- **`env(safe-area-inset-top)`**: CSS environment variable that returns the safe area inset for the top edge (notch, Dynamic Island, status bar). Returns `0px` on devices/browsers without safe areas.
- The `viewport-fit=cover` meta tag in `index.html` is already configured, which enables safe area CSS variables.
- This matches the established pattern in the codebase for handling safe areas.

---

## Expected Results

- Header content will appear below the status bar/notch on iOS devices
- No visual change on desktop or Android devices without notches
- Works in both portrait and landscape orientations
- Consistent safe area handling across the entire app
