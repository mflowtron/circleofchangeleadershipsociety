

# Fix: Status Bar Not Syncing with Theme

## Problem Identified

The status bar in the Natively app is not updating when the theme changes. Looking at your screenshot, the app is in light mode but the status bar shows light/white text (invisible against the light background).

**Root Cause:** The code is calling the wrong method name.

| Current (Wrong) | Correct |
|-----------------|---------|
| `setAppStatusBarStyleIOS()` | `setAppStatusBarStyle()` |

The Natively documentation example has a typo, but the actual SDK type definitions confirm the correct method is `setAppStatusBarStyle(style: string)`.

---

## Solution

Update `src/hooks/useNativelyThemeSync.ts` to use the correct method name.

### Current Code (Line 29 and 33)
```typescript
natively.setAppStatusBarStyleIOS('LIGHT');  // Wrong method name
natively.setAppStatusBarStyleIOS('DARK');   // Wrong method name
```

### Fixed Code
```typescript
natively.setAppStatusBarStyle('LIGHT');  // Correct method name
natively.setAppStatusBarStyle('DARK');   // Correct method name
```

---

## File Changes

| File | Change |
|------|--------|
| `src/hooks/useNativelyThemeSync.ts` | Replace `setAppStatusBarStyleIOS` with `setAppStatusBarStyle` (2 occurrences) |

---

## Expected Behavior After Fix

- **Light mode**: Status bar shows dark text/icons (readable on light background)
- **Dark mode**: Status bar shows light text/icons (readable on dark background)
- **Theme toggle**: Status bar updates immediately when switching themes

