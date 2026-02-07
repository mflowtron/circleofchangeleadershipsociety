

# Improve Profile Header Gradient and Text Contrast

## Summary

Enhance the profile header gradient for a more premium, polished look and improve the visual harmony between the gradient banner and the name text below it.

---

## Current Issues

1. **Flat gradient**: The current `bg-gradient-gold` is a simple diagonal linear gradient from gold to amber, which looks somewhat flat
2. **Abrupt transition**: The gradient ends abruptly where the avatar overlaps, creating visual tension
3. **Text contrast**: The name text uses `text-foreground` on a white card background, but the visual proximity to the gold gradient creates a perception of poor contrast

---

## Proposed Changes

### File: `src/pages/Profile.tsx`

**Line 174** - Replace the simple gradient with a more sophisticated multi-layer approach:

```tsx
// Before
<div className="h-24 bg-gradient-gold" />

// After
<div className="h-28 bg-gradient-to-br from-primary via-amber-500 to-amber-600 relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
</div>
```

This creates:
- A richer gradient with three color stops using Tailwind's built-in gradient utilities
- A subtle darkening at the bottom for depth
- A radial highlight overlay for a premium glass-like effect
- Slightly taller height (h-28 vs h-24) for better visual balance

**Line 204** - Improve name text visibility:

```tsx
// Before
<h2 className="text-xl font-bold text-foreground">{profile?.full_name}</h2>

// After
<h2 className="text-xl font-bold text-foreground drop-shadow-sm">{profile?.full_name}</h2>
```

Adding a subtle drop shadow helps the text feel more grounded against the nearby gradient.

---

## Visual Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Gradient direction | 135° diagonal | Bottom-right with overlays |
| Color stops | 2 (gold → amber) | 3 (primary → amber-500 → amber-600) |
| Depth effect | None | Subtle bottom shadow overlay |
| Highlight | None | Radial highlight top-right |
| Height | h-24 (96px) | h-28 (112px) |
| Name text | Plain | With subtle drop shadow |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Update gradient div (line 174) and name text (line 204) |

---

## Benefits

- More premium, polished appearance consistent with the "Golden & Dark" design system
- Better visual depth and dimension in the header
- Improved perceived contrast between gradient and text
- Works well in both light and dark modes (using theme-aware `primary` color)

