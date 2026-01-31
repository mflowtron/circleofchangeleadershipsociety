
# Natively Safe Area Insets Implementation Plan

## Overview

Implement a `NativelySafeAreaProvider` component that integrates with the Natively JavaScript SDK to retrieve device safe area insets and apply them via CSS custom properties. This ensures the app properly handles notches, status bars, and home indicators when running inside the Natively native wrapper on iOS and Android.

## Current State Analysis

The app currently uses browser-based `env(safe-area-inset-*)` CSS functions for safe area handling. The following elements already have safe area considerations:

**Headers (Sticky):**
- `Header.tsx` - Uses inline style `env(safe-area-inset-top)`
- `EventsDashboardHeader.tsx` - Uses `pt-safe` class
- `AttendeeLayout.tsx` header - Uses `pt-safe` class

**Sidebars (Fixed):**
- `Sidebar.tsx` - Uses inline style `env(safe-area-inset-top)`
- `EventsDashboardSidebar.tsx` - Uses inline style `env(safe-area-inset-top)`

**Bottom Navigation (Fixed):**
- `BottomNavigation.tsx` - Uses `pb-safe` class

**Floating Elements (Fixed):**
- `InstallBanner.tsx` - Uses `pb-safe` class
- `UpdateNotification.tsx` - Fixed bottom-4 (needs update)

**Modals/Overlays (Fixed):**
- `image-lightbox.tsx` - Uses inline `env(safe-area-inset-*)` styles
- `drawer.tsx` - Fixed bottom-0 (needs update)
- `toast.tsx` - Fixed top-0 (needs update)
- `sheet.tsx` - Fixed positioning (needs update)

---

## Implementation Details

### 1. Install Natively Package

The `natively` npm package needs to be installed as a dependency.

### 2. Create NativelySafeAreaProvider Component

**File:** `src/components/NativelySafeAreaProvider.tsx`

Based on the Natively SDK documentation, the implementation will:
- Import `NativelyInfo` from the `natively` package
- Check `browserInfo().isNativeApp` to detect native context
- Call `window.natively.getInsets()` to retrieve inset values
- Set CSS custom properties on `document.documentElement`
- Add `is-natively-app` class to enable CSS targeting

```text
API Usage:
- Detection: new NativelyInfo().browserInfo().isNativeApp
- Insets: window.natively.getInsets(callback)
- Response: { top, bottom, left, right } in pixels
```

### 3. Update Global CSS

**File:** `src/index.css`

Add CSS custom property defaults and Natively-specific override rules:

```text
:root {
  --natively-inset-top: 0px;
  --natively-inset-right: 0px;
  --natively-inset-bottom: 0px;
  --natively-inset-left: 0px;
}

/* When running in Natively, the existing .pt-safe and .pb-safe 
   classes will be overridden to use Natively insets instead of 
   browser env() values */

.is-natively-app .pt-safe {
  padding-top: var(--natively-inset-top) !important;
}

.is-natively-app .pb-safe {
  padding-bottom: var(--natively-inset-bottom) !important;
}
```

### 4. Wrap App with Provider

**File:** `src/main.tsx`

Wrap the entire application with the provider to ensure insets are available before any rendering:

```text
<NativelySafeAreaProvider>
  <App />
  <UpdateNotification />
</NativelySafeAreaProvider>
```

### 5. Update Fixed/Sticky Elements

Each fixed or sticky element needs to reference Natively insets when running in the native app. The approach varies by element type:

**Elements Using Existing Safe Area Classes (pt-safe, pb-safe):**
These will automatically work via the CSS overrides in step 3:
- EventsDashboardHeader
- AttendeeLayout header
- BottomNavigation
- InstallBanner

**Elements Using Inline Styles with env():**
Need conditional logic or dual CSS rules:
- Header.tsx - Update inline style to use CSS variable
- Sidebar.tsx - Update inline style to use CSS variable
- EventsDashboardSidebar.tsx - Update inline style to use CSS variable
- image-lightbox.tsx - Update inline styles to use CSS variables

**Elements Missing Safe Area Handling:**
- UpdateNotification.tsx - Add bottom inset handling
- drawer.tsx - Add bottom inset for DrawerContent
- toast.tsx - Add top/bottom inset for ToastViewport
- sheet.tsx - Add insets based on side (top, bottom, left, right)

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Update | Add `natively` dependency |
| `src/components/NativelySafeAreaProvider.tsx` | Create | Provider component with SDK integration |
| `src/index.css` | Update | Add CSS custom property defaults and Natively overrides |
| `src/main.tsx` | Update | Wrap app with NativelySafeAreaProvider |
| `src/components/layout/Header.tsx` | Update | Use CSS variable instead of inline env() |
| `src/components/layout/Sidebar.tsx` | Update | Use CSS variable instead of inline env() |
| `src/components/events/EventsDashboardSidebar.tsx` | Update | Use CSS variable instead of inline env() |
| `src/components/events/EventsDashboardHeader.tsx` | Update | Add Natively-aware styling |
| `src/components/pwa/UpdateNotification.tsx` | Update | Add bottom inset handling |
| `src/components/ui/drawer.tsx` | Update | Add bottom inset for content |
| `src/components/ui/toast.tsx` | Update | Add top/bottom insets for viewport |
| `src/components/ui/sheet.tsx` | Update | Add directional insets |
| `src/components/ui/image-lightbox.tsx` | Update | Use CSS variables for positioning |
| `src/components/attendee/BottomNavigation.tsx` | Update | Ensure Natively compatibility |
| `src/components/attendee/AttendeeLayout.tsx` | Update | Ensure Natively compatibility |

---

## Technical Approach

### CSS Variable Strategy

Rather than duplicating logic in every component, we use a layered CSS approach:

1. **Default values**: CSS custom properties default to `0px`
2. **Natively overrides**: When `is-natively-app` class is present, safe area classes use Natively variables
3. **Fallback chain**: Components use CSS variables that work in both contexts

```text
/* Safe area utility that works in both contexts */
.safe-top {
  padding-top: env(safe-area-inset-top);
}

.is-natively-app .safe-top {
  padding-top: var(--natively-inset-top);
}
```

### Component Updates Pattern

For components with inline styles, convert to use CSS variables:

**Before:**
```text
style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
```

**After:**
```text
style={{ paddingTop: 'max(0.75rem, var(--safe-inset-top, env(safe-area-inset-top)))' }}
```

The CSS will set `--safe-inset-top` to the Natively value when in native context.

---

## Safety Guarantees

1. **Web unaffected**: All changes are gated behind `isNativeApp` check and `is-natively-app` class
2. **No layout shift**: CSS variables default to `0px` before SDK callback fires
3. **Early initialization**: Provider runs in useEffect immediately on mount
4. **Graceful degradation**: If SDK fails, defaults remain at `0px`

---

## Testing Considerations

After implementation, test on:
1. Web browser - Verify no visual changes
2. iOS native app (Natively) - Verify insets apply to notch/home indicator
3. Android native app (Natively) - Verify insets apply to status bar/navigation bar
4. Orientation changes - Insets should update when device rotates
