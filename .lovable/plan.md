

# Fix Layout Jump and Card Shadow Clipping on Feed Page

## Summary

This plan addresses two related issues on the Feed page:
1. The layout "jumps" when switching between tabs (All Posts / My Chapter / My Posts) due to scrollbar appearance changes
2. Card shadows are getting clipped on the sides

Both issues stem from overflow handling in the layout.

---

## Problem Analysis

### Issue 1: Layout Jump on Tab Switch

On macOS, changing from `overflow-y-auto` to `overflow-y-scroll` doesn't reliably prevent layout shifts because macOS uses overlay scrollbars by default (they don't take up space). The CSS property `scrollbar-gutter: stable` is designed specifically for this case - it reserves space for the scrollbar without forcing it to always appear.

### Issue 2: Shadow Clipping

The Feed page uses `overflow-x-hidden` to prevent horizontal scrolling. However, this also clips any box-shadows that extend beyond the container edges. The cards use `shadow-soft` which creates shadows that extend outward, and these get cut off at the container boundary.

---

## Solution

### File 1: `src/components/layout/AppLayout.tsx`

Add `scrollbar-gutter: stable` to reserve scrollbar space consistently across all platforms, and revert to `overflow-y-auto` (since overlay scrollbars on macOS don't need `scroll`).

**Line 40** - Update the main element:

| Before | After |
|--------|-------|
| `overflow-x-hidden overflow-y-scroll` | `overflow-x-hidden overflow-y-auto` + inline style for `scrollbar-gutter: stable` |

```tsx
// After change:
<main 
  className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto"
  style={{ scrollbarGutter: 'stable' }}
>
```

### File 2: `src/pages/Feed.tsx`

Add horizontal padding to the feed container so shadows have room to render without being clipped. Also remove `overflow-x-hidden` since the parent layout already handles horizontal overflow.

**Line 29** - Update the container div:

| Before | After |
|--------|-------|
| `max-w-2xl mx-auto overflow-x-hidden` | `max-w-2xl mx-auto px-1` |

The `px-1` (4px padding) provides just enough breathing room for the `shadow-soft` to render without clipping, while keeping the visual layout nearly identical.

---

## Technical Details

### Why `scrollbar-gutter: stable`?

This CSS property tells the browser to always reserve space for the scrollbar gutter, even when the scrollbar itself isn't visible. This prevents the content area from shifting when content height changes cause the scrollbar to appear/disappear.

Browser support: Supported in all modern browsers (Chrome 94+, Firefox 97+, Safari 17+, Edge 94+).

### Why Remove `overflow-x-hidden` from Feed?

The `overflow-x-hidden` on the Feed container was clipping shadows. Since:
1. The parent `<main>` already has `overflow-x-hidden`
2. The content is constrained by `max-w-2xl` anyway

...there's no need for double overflow clipping. The padding approach is more elegant.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/AppLayout.tsx` | Add `scrollbar-gutter: stable` style, revert to `overflow-y-auto` |
| `src/pages/Feed.tsx` | Replace `overflow-x-hidden` with `px-1` padding |

---

## Expected Results

- Tab switching will no longer cause any layout shift
- Card shadows will render fully without clipping
- Works consistently across macOS, Windows, and mobile platforms

