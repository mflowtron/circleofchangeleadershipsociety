

# Fix Access Code Visibility in Dark Mode Emails

## Problem

When the access code email is viewed on devices using dark mode, the 6-digit code becomes nearly invisible. This happens because some email clients (like Apple Mail, Gmail app) apply automatic color inversions in dark mode, turning the dark text (`#1A1814`) into light text while leaving the background light.

## Solution

Force the code display area to maintain consistent colors regardless of dark mode by using explicit background colors and adding dark mode meta tags that instruct email clients to preserve our intended styling.

## Technical Changes

### File to Modify
`supabase/functions/send-order-access-code/index.ts`

### Changes

1. **Add Dark Mode Meta Tags**
   - Add `color-scheme` meta tag to tell email clients we support both light and dark modes
   - Add a `<style>` block with `@media (prefers-color-scheme: dark)` rules

2. **Force Code Box Colors**
   - Use a solid white background (`#FFFFFF`) instead of gradient for the code box
   - Add explicit `!important` or use inline styles that email clients won't override
   - Add a contrasting dark background option that works in dark mode

3. **Recommended Approach: Dark Code Box**
   Since the surrounding card may get inverted, use a dark charcoal background with gold/white text for the code - this will look great in both light and dark modes:

   | Element | Light Mode | Dark Mode |
   |---------|------------|-----------|
   | Code box background | #1A1814 (charcoal) | #1A1814 (stays dark) |
   | Code text | #D4A84B (gold) | #D4A84B (gold) |
   | Border | #D4A84B (gold) | #D4A84B (gold) |

   This inverted design ensures the code is always readable because:
   - Dark backgrounds typically don't get inverted by email clients
   - Gold text on charcoal has excellent contrast
   - Matches the brand aesthetic (golden accents on dark)

### Updated Code Box HTML

```html
<div style="display:inline-block; background-color:#1A1814; border:2px solid #D4A84B; border-radius:12px; padding:20px 32px;">
  <span style="font-size:36px; font-weight:700; letter-spacing:12px; color:#D4A84B; font-family:'Courier New', monospace;">
    ${code}
  </span>
</div>
```

## Visual Result

The code box will now have:
- **Dark charcoal background** (`#1A1814`) - consistent in all modes
- **Golden text** (`#D4A84B`) - high contrast, brand-aligned
- **Golden border** (`#D4A84B`) - visual emphasis
- Excellent readability in both light and dark mode email clients

## Why This Works

Email clients that apply dark mode transformations typically:
- Invert light backgrounds to dark
- Invert dark text to light
- Leave already-dark backgrounds alone
- Leave colored text (like gold) alone

By using a dark background with colored text, we sidestep the problematic automatic inversions entirely.

