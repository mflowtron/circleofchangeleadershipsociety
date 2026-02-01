
# Remove All Traces of Previous Natively Safe Area Implementation

## Problem

The previous Natively safe area implementation used CSS variables (`--safe-inset-top`, `--safe-inset-bottom`, etc.) that were set by `NativelySafeAreaProvider`. Since we deleted that provider, these CSS variables no longer exist, but several components still reference them. This is causing issues on web because:

1. The `var(--safe-inset-X, env(...))` fallback pattern doesn't work reliably across browsers
2. Some browsers may not correctly parse the nested fallback
3. Standard web browsers don't have safe area insets, so these should be `0` or not applied at all

## Solution

Replace all instances of `var(--safe-inset-*, ...)` with either:
- Just `env(safe-area-inset-*)` for PWA/native contexts (works on iOS Safari, native wrappers)
- Standard padding values for non-safe-area-aware contexts

Since Natively now handles safe areas at the native layer (when enabled in dashboard), components don't need complex fallback logic anymore.

---

## Files to Update

### 1. `src/components/ui/drawer.tsx` (Line 37)

**Current:**
```typescript
style={{ paddingBottom: 'var(--safe-inset-bottom, env(safe-area-inset-bottom, 0px))' }}
```

**Change to:**
```typescript
style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
```

---

### 2. `src/components/ui/sheet.tsx` (Lines 50-72)

**Current:**
The `getSafeAreaPadding` function returns styles with `var(--safe-inset-*, ...)` pattern.

**Change to:**
Remove the entire `getSafeAreaPadding` function and remove the `style` prop from `SheetContent`. The Natively dashboard toggle now handles safe areas at the native layer, so these inline styles are no longer needed.

---

### 3. `src/components/ui/toast.tsx` (Lines 20-23)

**Current:**
```typescript
style={{ 
  paddingTop: 'max(1rem, var(--safe-inset-top, env(safe-area-inset-top, 0px)))',
  paddingBottom: 'max(1rem, var(--safe-inset-bottom, env(safe-area-inset-bottom, 0px)))'
}}
```

**Change to:**
Remove the style prop entirely. Standard padding from the className is sufficient.

---

### 4. `src/components/pwa/UpdateNotification.tsx` (Line 90)

**Current:**
```typescript
style={{ bottom: 'max(1rem, var(--safe-inset-bottom, env(safe-area-inset-bottom)))', left: '1rem', right: '1rem' }}
```

**Change to:**
```typescript
style={{ bottom: '1rem', left: '1rem', right: '1rem' }}
```

Since Natively handles safe areas at the native layer, we don't need to account for them in inline styles. Standard spacing is sufficient.

---

### 5. `src/components/ui/image-lightbox.tsx` (Lines 299-315, 349)

**Current:**
Three instances of `var(--safe-inset-*, env(...))` pattern for close button, zoom indicator, and swipe hint positioning.

**Change to:**
Use simple `1rem` or `2rem` values instead of the complex safe area calculations. Since Natively handles safe areas at the native layer, the lightbox content will already be positioned correctly within the safe area.

---

### 6. `src/index.css` (Lines 390-399)

**Current:**
```css
/* Safe area insets for notched devices */
@supports (padding: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .pt-safe {
    padding-top: env(safe-area-inset-top);
  }
}
```

**Change:**
Keep this CSS but remove it entirely. Since Natively handles safe areas at the native layer when enabled, and the web doesn't need these utilities anymore, we should remove them to prevent any conflicts. Components using `pt-safe` and `pb-safe` classes should be updated.

---

### 7. Components using `pt-safe` and `pb-safe` classes

These components use the safe area utility classes that we're removing:

| File | Current | Change |
|------|---------|--------|
| `src/components/layout/Header.tsx` | `pt-safe` class | Remove the class |
| `src/components/layout/Sidebar.tsx` | `pt-safe` class | Remove the class |
| `src/components/events/EventsDashboardSidebar.tsx` | `pt-safe` class | Remove the class |
| `src/components/attendee/AttendeeLayout.tsx` | `pt-safe` class | Remove the class |
| `src/components/attendee/BottomNavigation.tsx` | `pb-safe` class | Remove the class |
| `src/components/pwa/InstallBanner.tsx` | `pb-safe` class | Remove the class |
| `src/pages/attendee/Index.tsx` | `pt-safe pb-safe` classes | Remove both classes |

---

## Summary of Changes

| File | Action |
|------|--------|
| `src/components/ui/drawer.tsx` | Simplify inline style |
| `src/components/ui/sheet.tsx` | Remove `getSafeAreaPadding` function and style prop |
| `src/components/ui/toast.tsx` | Remove style prop |
| `src/components/pwa/UpdateNotification.tsx` | Simplify inline style |
| `src/components/ui/image-lightbox.tsx` | Simplify 3 inline styles |
| `src/index.css` | Remove `.pt-safe` and `.pb-safe` CSS rules |
| `src/components/layout/Header.tsx` | Remove `pt-safe` class |
| `src/components/layout/Sidebar.tsx` | Remove `pt-safe` class |
| `src/components/events/EventsDashboardSidebar.tsx` | Remove `pt-safe` class |
| `src/components/attendee/AttendeeLayout.tsx` | Remove `pt-safe` class |
| `src/components/attendee/BottomNavigation.tsx` | Remove `pb-safe` class |
| `src/components/pwa/InstallBanner.tsx` | Remove `pb-safe` class |
| `src/pages/attendee/Index.tsx` | Remove `pt-safe pb-safe` classes |

---

## Why This Works

With Natively's Safe Area toggle enabled in the dashboard:
- The native layer handles all safe area padding automatically
- Your web content starts below the status bar and above the home indicator
- Background color is controlled by `setAppBackgroundColor()` (already implemented in `useNativelyThemeSync`)

For web (non-native) contexts:
- Standard browsers don't have notches or safe areas, so no special handling is needed
- Removing these styles ensures consistent behavior across all web browsers
