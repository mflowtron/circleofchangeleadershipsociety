

# Fix iOS Vertical Stretching on Square Elements

## Problem
Checkbox, RadioGroupItem, and similar square UI elements appear stretched vertically (taller than they are wide) on iOS devices, when they should maintain a 1:1 aspect ratio.

## Root Cause
In `src/index.css`, there's a CSS rule for touch-friendly tap targets that applies a `min-height: 44px` to all buttons on touch devices:

```css
@media (pointer: coarse) {
  button,
  [role="button"],
  input[type="button"],
  input[type="submit"],
  a {
    min-height: 44px;
  }
}
```

Since Radix UI's `Checkbox` and `RadioGroupItem` components render as `<button>` elements, this rule forces them to be at least 44px tall. However, these components are styled with `h-4 w-4` (16x16px), so the `min-height: 44px` overrides the height while leaving the width at 16px, resulting in a stretched, non-square appearance.

The `Switch` component already solved this problem by using rigid inline styles with explicit `min-height`, `max-height`, `min-width`, and `max-width` values that override the global CSS rule.

## Affected Components
1. **Checkbox** (`src/components/ui/checkbox.tsx`) - Uses `h-4 w-4` (16x16px)
2. **RadioGroupItem** (`src/components/ui/radio-group.tsx`) - Uses `aspect-square h-4 w-4` (16x16px)
3. **Avatar** (`src/components/ui/avatar.tsx`) - Uses `h-10 w-10` (40x40px) - may also be affected

## Solution
Apply the same fix pattern used by the Switch component: add rigid inline styles that enforce exact dimensions and prevent flex stretching.

---

## Technical Details

### 1. Fix Checkbox Component

Add inline styles to enforce fixed 16x16px dimensions:

```tsx
// src/components/ui/checkbox.tsx
<CheckboxPrimitive.Root
  ref={ref}
  className={cn(
    "peer h-4 w-4 shrink-0 rounded-sm border border-primary ...",
    className,
  )}
  style={{
    width: '16px',
    minWidth: '16px',
    maxWidth: '16px',
    height: '16px',
    minHeight: '16px',
    maxHeight: '16px',
    flexShrink: 0,
  }}
  {...props}
>
```

### 2. Fix RadioGroupItem Component

Add inline styles to enforce fixed 16x16px dimensions:

```tsx
// src/components/ui/radio-group.tsx
<RadioGroupPrimitive.Item
  ref={ref}
  className={cn(
    "aspect-square h-4 w-4 rounded-full border border-primary ...",
    className,
  )}
  style={{
    width: '16px',
    minWidth: '16px',
    maxWidth: '16px',
    height: '16px',
    minHeight: '16px',
    maxHeight: '16px',
    flexShrink: 0,
  }}
  {...props}
>
```

### 3. Fix Avatar Component

Add inline styles to enforce fixed 40x40px dimensions (default size):

```tsx
// src/components/ui/avatar.tsx
<AvatarPrimitive.Root
  ref={ref}
  className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
  style={{
    width: '40px',
    minWidth: '40px',
    maxWidth: '40px',
    height: '40px',
    minHeight: '40px',
    maxHeight: '40px',
    flexShrink: 0,
  }}
  {...props}
/>
```

> **Note on Avatar**: Since Avatar accepts custom `className` overrides for different sizes (e.g., `h-8 w-8`), the inline styles may conflict. We'll need to conditionally extract size from className or use a different approach. A simpler solution is to just add `flexShrink: 0` and rely on `aspect-square` with a fixed width:

```tsx
// Alternative for Avatar - simpler approach
<AvatarPrimitive.Root
  ref={ref}
  className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full aspect-square", className)}
  style={{ flexShrink: 0, flexGrow: 0 }}
  {...props}
/>
```

### Files to Modify
1. `src/components/ui/checkbox.tsx` - Add inline styles
2. `src/components/ui/radio-group.tsx` - Add inline styles to RadioGroupItem
3. `src/components/ui/avatar.tsx` - Add flex constraints and aspect-square

