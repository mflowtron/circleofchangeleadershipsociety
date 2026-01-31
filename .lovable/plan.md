

# Fix: Safe Area Color Should Match Header Background

## Problem Identified

Looking at your screenshot, the safe area (status bar region) has a dark charcoal color (`#161412` - the app background), but the header below it has a lighter card-style background. This creates a visible color mismatch between the safe area and the header.

**Current behavior:**
- Safe area color: `#161412` (dark mode background)
- Header color: `hsl(30, 10%, 11%)` ≈ `#1F1C1A` (card background with 80% opacity + blur)

## Solution

Update `setAppBackgroundColor()` to use the **card** color instead of the **background** color, so the safe area seamlessly blends with the header.

### Color Values

| Theme | Current (Background) | Should Be (Card) |
|-------|---------------------|------------------|
| Dark  | `#161412` (hsl 30 12% 8%) | `#1F1C1A` (hsl 30 10% 11%) |
| Light | `#F9F8F5` (hsl 40 30% 97%) | `#FFFDFB` (hsl 40 35% 99%) |

---

## File Changes

### Update `src/hooks/useNativelyThemeSync.ts`

Change the background colors from the overall app background to the card/header color:

**Lines 30 and 34:**

| Line | Current | After |
|------|---------|-------|
| 30 | `natively.setAppBackgroundColor('#161412');` | `natively.setAppBackgroundColor('#1F1C1A');` |
| 34 | `natively.setAppBackgroundColor('#F9F8F5');` | `natively.setAppBackgroundColor('#FFFDFB');` |

---

## Expected Result

After this change:
- **Dark mode**: The safe area will have the same color as the header (`#1F1C1A`), creating a seamless appearance
- **Light mode**: The safe area will match the header's warm white (`#FFFDFB`)

The header's glassmorphism effect (`bg-card/80 backdrop-blur-md`) will blend naturally with the native safe area since they'll share the same base color.

