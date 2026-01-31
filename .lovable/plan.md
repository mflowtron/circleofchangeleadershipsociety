

# Simplify Safe Area Handling via Natively Dashboard

## Overview

Replace the complex CSS-based safe area management with Natively's built-in Safe Area toggle. This approach lets Natively handle safe areas at the native layer, eliminating the need for JavaScript inset calculations and CSS variable overrides.

## Current vs. Proposed Approach

| Aspect | Current (Complex) | Proposed (Simple) |
|--------|-------------------|-------------------|
| Safe Area Source | `window.natively.getInsets()` + CSS variables | Natively handles natively |
| Code Required | `NativelySafeAreaProvider`, CSS overrides, per-component styles | Just enable dashboard toggle |
| Background Color | CSS variables | `setAppBackgroundColor()` (already implemented) |
| Maintenance | High - scattered across many files | Low - single dashboard setting |

## What Natively's Safe Area Does

When **Safe Area is Enabled** in the Natively dashboard:
- The native layer automatically adds safe area padding (status bar, home indicator)
- The safe area background color is controlled by the `App Background Color` setting (which we already sync via `setAppBackgroundColor()` in our theme hook)
- Your web content starts below the status bar and above the home indicator

When **Safe Area is Disabled** (current setting):
- Content goes edge-to-edge (fullscreen)
- Your web app must handle safe areas via CSS

---

## Implementation Plan

### Step 1: Enable Safe Area in Natively Dashboard

This is a manual step you need to do in the Natively dashboard:

1. Go to your Natively project dashboard
2. Navigate to **Appearance > Style**
3. Find the **Safe Area** toggle
4. **Enable** it

This makes Natively automatically handle safe area insets at the native layer.

### Step 2: Remove NativelySafeAreaProvider

**File:** `src/components/NativelySafeAreaProvider.tsx`

Delete this file entirely. It's no longer needed since Natively handles safe areas natively.

### Step 3: Update main.tsx

**File:** `src/main.tsx`

Remove the `NativelySafeAreaProvider` wrapper:

```text
Before:
import { NativelySafeAreaProvider } from "./components/NativelySafeAreaProvider";

createRoot(document.getElementById("root")!).render(
  <NativelySafeAreaProvider>
    <App />
    <UpdateNotification />
  </NativelySafeAreaProvider>
);

After:
createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <UpdateNotification />
  </>
);
```

### Step 4: Clean Up CSS Variables

**File:** `src/index.css`

Remove the Natively-specific safe area CSS:

Lines to remove:
- Lines 11-15: `--natively-inset-*` variable declarations
- Lines 412-426: `.is-natively-app` class and its overrides

Keep the standard `env(safe-area-inset-*)` utilities for PWA/web contexts.

### Step 5: Update Components Using Inline Safe Area Styles

Several components use inline styles with `--safe-inset-*` or `--natively-inset-*`. These should be simplified to use standard Tailwind safe area utilities which rely on `env()`:

| Component | Current | After |
|-----------|---------|-------|
| `EventsDashboardSidebar.tsx` | `style={{ paddingTop: 'max(1rem, var(--safe-inset-top...))' }}` | `className="pt-safe"` + inline fallback |
| `Sidebar.tsx` | Same pattern | Same simplification |
| `Header.tsx` | Same pattern | Same simplification |

For components already using `pt-safe` or `pb-safe` classes, no changes needed - they'll work with standard `env()` values.

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/components/NativelySafeAreaProvider.tsx` | Delete |
| `src/main.tsx` | Remove provider wrapper |
| `src/index.css` | Remove Natively-specific CSS variables and overrides |
| `src/components/events/EventsDashboardSidebar.tsx` | Simplify inline safe area style |
| `src/components/layout/Sidebar.tsx` | Simplify inline safe area style |
| `src/components/layout/Header.tsx` | Simplify inline safe area style |

---

## What Stays the Same

- **Theme sync hook** (`useNativelyThemeSync.ts`) - This remains! It's still needed to:
  - Sync status bar style with theme
  - Sync `setAppBackgroundColor()` which controls the safe area background color

- **Standard safe area utilities** (`pt-safe`, `pb-safe`) - These still work for PWA and web contexts using standard `env(safe-area-inset-*)` values

---

## Manual Step Required

Before implementing code changes, you must enable Safe Area in the Natively dashboard:

**Natively Dashboard > Appearance > Style > Safe Area = Enabled**

This is a dashboard configuration, not a code change.

---

## Benefits

1. **Simpler codebase** - No JavaScript inset calculations, fewer CSS overrides
2. **Native performance** - Safe areas handled at the native layer, not via CSS hacks
3. **Consistent behavior** - Natively manages safe areas the same way across all devices
4. **Easier maintenance** - Single toggle instead of scattered code across 15+ files
5. **Better theming** - Background color already syncs via existing `useNativelyThemeSync` hook

