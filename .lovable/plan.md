
# Fix Bottom Safe Area Padding in Natively Wrapper

## Problem
The bottom navigation and other bottom-anchored elements are being overlapped by the iOS home indicator bar when the app runs inside the Natively native wrapper. This happens because the CSS `env(safe-area-inset-bottom)` variable isn't properly reported inside the WebView—it returns 0 instead of the actual safe area value.

## Solution
Create a hook that fetches the actual native safe area insets from the Natively SDK using `window.natively.getInsets()` and applies them as CSS custom properties on the document root. This allows all components to use these values as a fallback when `env()` doesn't work.

## Implementation

### 1. Create new hook: `src/hooks/useNativelySafeArea.ts`
This hook will:
- Check if running inside the Natively wrapper
- Call `getInsets()` to fetch native safe area values
- Set CSS custom properties (`--natively-safe-area-bottom`, etc.) on `document.documentElement`
- Provide fallback values for non-native environments

```typescript
// Callback returns: { top, left, right, bottom }
// Sets: --natively-safe-area-top, --natively-safe-area-bottom, etc.
```

### 2. Initialize the hook in the Attendee Dashboard
Add the hook to `src/pages/attendee/Dashboard.tsx` so safe area values are available app-wide when the attendee app loads.

### 3. Update bottom-anchored components to use the Natively insets
Components that need updating:

| Component | Current | After |
|-----------|---------|-------|
| `BottomNavigation.tsx` | `env(safe-area-inset-bottom)` | `max(env(safe-area-inset-bottom), var(--natively-safe-area-bottom, 0px))` |
| `AttendeeLayout.tsx` (main content) | `64px + env(...)` | `calc(64px + max(env(...), var(--natively-safe-area-bottom, 0px)))` |
| `ConferenceFeed.tsx` (FAB) | `env(...) + 80px` | `calc(max(env(...), var(..., 0px)) + 80px)` |

### 4. Pattern for the CSS fallback
```css
/* Uses native CSS env() if available, falls back to Natively value */
padding-bottom: max(env(safe-area-inset-bottom), var(--natively-safe-area-bottom, 0px));
```

This ensures:
- Standard browsers continue to work with `env()`
- Natively wrapper gets proper insets from the SDK
- Non-native environments gracefully fall back to 0px

## Files to Change
1. **Create** `src/hooks/useNativelySafeArea.ts` — new hook to fetch and apply insets
2. **Modify** `src/pages/attendee/Dashboard.tsx` — initialize the hook
3. **Modify** `src/components/attendee/BottomNavigation.tsx` — use the safe fallback
4. **Modify** `src/components/attendee/AttendeeLayout.tsx` — update main content padding
5. **Modify** `src/components/attendee/feed/ConferenceFeed.tsx` — update FAB positioning

## Technical Notes
- The hook wraps all Natively SDK calls in try-catch blocks per existing project conventions
- CSS custom properties are set on `:root` so they're available globally
- The `max()` CSS function ensures the larger value wins (handles edge cases)
