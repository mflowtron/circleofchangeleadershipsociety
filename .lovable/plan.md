
# Natively App Deployment Preparation

## Overview

This plan addresses the safe area issues visible in the Natively previewer and prepares the app for native deployment to the Apple App Store and Google Play Store via Natively (buildnatively.com).

## Problem Analysis

Based on the screenshot provided, the header content (hamburger menu, logo, theme toggle, avatar) is being clipped at the top because the safe area inset is not being properly respected. The app renders content behind the iOS status bar/notch.

### Current State Issues

1. **Header.tsx** uses `sticky top-0` with inline `paddingTop: max(0.75rem, env(safe-area-inset-top))` - but this only adds padding inside the header, the header still sticks at `top: 0` which is above the safe area
2. **EventsDashboardHeader.tsx** uses `pt-safe` class but same `sticky top-0` issue
3. **EventsLayout.tsx** has no safe area handling at all
4. **Orders Dashboard** has no safe area handling
5. The `viewport-fit=cover` meta tag is already present in `index.html` (good), but CSS implementations are inconsistent

### Root Cause

When Natively has "Safe Area" set to **Disabled** (which allows full-screen WebView), the web app must handle safe areas via CSS. The current approach of adding `padding-top` to the header content doesn't work because `sticky top-0` still positions the header at the absolute top of the viewport - behind the notch/status bar.

---

## Solution Architecture

### Approach 1: App-Level Safe Area Wrapper (Recommended)

Instead of handling safe areas in each individual header/footer component, create a consistent safe area wrapper at the app layout level that pushes content down from the top and up from the bottom.

```text
+------------------------------------------+
|  [status bar / notch area - bg-background] |  <-- Safe area spacer (env padding)
+------------------------------------------+
|  [Header - sticky within content area]    |
+------------------------------------------+
|  [Main Content - scrollable]              |
+------------------------------------------+
|  [Bottom nav/actions - if any]            |
+------------------------------------------+
|  [home indicator area - bg-background]    |  <-- Safe area spacer (env padding)
+------------------------------------------+
```

### Key Changes

1. **Add comprehensive safe area utility classes** - Extend Tailwind/CSS to include all four safe area directions
2. **Create a root safe area container** - Wrap the entire app in a container that handles safe areas consistently
3. **Update all layout components** - Ensure headers use `top-[env(safe-area-inset-top)]` or exist within a properly padded container
4. **Add left/right safe area handling** - For landscape orientation on notched devices

---

## Implementation Plan

### 1. Enhance CSS Safe Area Utilities

Update `src/index.css` to include comprehensive safe area classes:

| Class | Purpose |
|-------|---------|
| `.safe-top` | Adds `padding-top: env(safe-area-inset-top)` |
| `.safe-bottom` | Adds `padding-bottom: env(safe-area-inset-bottom)` |
| `.safe-left` | Adds `padding-left: env(safe-area-inset-left)` |
| `.safe-right` | Adds `padding-right: env(safe-area-inset-right)` |
| `.safe-x` | Adds left + right padding |
| `.safe-y` | Adds top + bottom padding |
| `.safe-all` | Adds all four paddings |
| `.top-safe` | Sets `top: env(safe-area-inset-top)` for sticky positioning |

### 2. Update AppLayout Component

Modify `src/components/layout/AppLayout.tsx` to:
- Add a background-colored safe area spacer at the top of the viewport
- Ensure the header sticks below the safe area, not at `top: 0`

### 3. Update Header Component

Modify `src/components/layout/Header.tsx`:
- Remove inline `paddingTop` style
- Use `sticky top-safe` instead of `sticky top-0` to position header below safe area
- OR keep at `top-0` if wrapped in a container with safe area padding

### 4. Update All Other Layouts

| Layout File | Changes Required |
|-------------|------------------|
| `EventsDashboardLayout.tsx` | Add safe area container wrapper |
| `EventsDashboardHeader.tsx` | Update positioning to respect safe areas |
| `EventsDashboardSidebar.tsx` | Keep existing inline style (already handles safe area) |
| `EventsLayout.tsx` | Add safe area padding to header |
| `AttendeeLayout.tsx` | Verify `pt-safe` class is working correctly |
| `Sidebar.tsx` | Keep existing inline style (already handles safe area) |
| `Auth.tsx` | Add safe area padding for standalone screens |
| `orders/Index.tsx` | Add safe area handling |
| `orders/Dashboard.tsx` | Add safe area padding to header |

### 5. Add Natively SDK Detection (Optional Enhancement)

Create a utility to detect if the app is running inside Natively's WebView:

```typescript
// src/utils/nativelyUtils.ts
export function isRunningInNatively(): boolean {
  return typeof window !== 'undefined' && 
         (window.navigator.userAgent.includes('Natively') ||
          // Check for Natively's injected objects
          'natively' in window);
}
```

This allows conditional behavior for native-specific features.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/index.css` | Update | Add comprehensive safe area utility classes |
| `src/components/layout/AppLayout.tsx` | Update | Add safe area wrapper around content |
| `src/components/layout/Header.tsx` | Update | Remove inline paddingTop, use proper positioning |
| `src/layouts/EventsDashboardLayout.tsx` | Update | Add safe area wrapper |
| `src/components/events/EventsDashboardHeader.tsx` | Update | Fix safe area positioning |
| `src/layouts/EventsLayout.tsx` | Update | Add safe area handling to header |
| `src/components/attendee/AttendeeLayout.tsx` | Update | Verify and fix safe area implementation |
| `src/pages/Auth.tsx` | Update | Add safe area handling |
| `src/pages/orders/Index.tsx` | Update | Add safe area handling |
| `src/pages/orders/Dashboard.tsx` | Update | Add safe area handling |
| `tailwind.config.ts` | Update | Add custom spacing values for safe areas |

---

## Technical Details

### CSS Safe Area Pattern

The key fix is using CSS to position sticky elements at `top: env(safe-area-inset-top)` instead of `top: 0`:

```css
/* Before - breaks with notch */
.header {
  position: sticky;
  top: 0;
  padding-top: max(0.75rem, env(safe-area-inset-top));
}

/* After - works with notch */
.header {
  position: sticky;
  top: env(safe-area-inset-top, 0);
  padding-top: 0.75rem;
}
```

Alternatively, wrap the entire scrollable area in a container with padding:

```css
.app-container {
  padding-top: env(safe-area-inset-top, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.header {
  position: sticky;
  top: 0; /* Now top: 0 is relative to the padded container */
}
```

### Tailwind Configuration

Add custom utilities for dynamic safe area positioning:

```typescript
// tailwind.config.ts
extend: {
  spacing: {
    'safe-top': 'env(safe-area-inset-top, 0px)',
    'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
    'safe-left': 'env(safe-area-inset-left, 0px)',
    'safe-right': 'env(safe-area-inset-right, 0px)',
  }
}
```

This enables classes like `top-safe-top` and `pb-safe-bottom`.

---

## Natively Configuration Recommendations

When setting up the app in Natively's dashboard, recommend these settings:

| Setting | Recommended Value | Reason |
|---------|-------------------|--------|
| Safe Area | **Disabled** | Let the web app handle safe areas for more control |
| Status Bar Style | **Light** or **Dark** | Match your app's theme |
| App Background Color | Match your header color (`#D4A842` for gold theme) | Shows behind content during load |
| Swipe Navigation | **Disabled** | Your app has its own navigation |
| Pull To Refresh | **Disabled** | Your app has custom pull-to-refresh |

---

## Testing Checklist

After implementation, verify these scenarios in Natively Previewer:

- [ ] Header content is fully visible on iPhone with notch (14 Pro, 15 Pro, etc.)
- [ ] Header content is visible on iPhone SE (no notch, smaller safe area)
- [ ] Bottom navigation doesn't overlap with home indicator
- [ ] Sidebar opens without clipping
- [ ] Login/Auth screen handles safe areas
- [ ] Attendee app layout works correctly
- [ ] Public events pages display properly
- [ ] Landscape orientation doesn't clip content on sides
