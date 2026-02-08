
# Fix Announcement Card Centering Issue

## Problem Analysis
The "Important Update" announcement card is appearing offset to the left on the Feed screen. Looking at the screenshot, the content is visibly cut off on the left side - showing only "ule Change" instead of "Schedule Change".

After investigating the card components, I identified the root cause:

**AnnouncementCard** has this structure:
```tsx
<div className="... flex items-center justify-center px-6">  <!-- padding here -->
  <div className="... w-full max-w-[340px]">  <!-- no padding -->
```

**PollCard** (which works correctly) has this structure:
```tsx
<div className="... flex items-center justify-center">  <!-- no padding -->
  <div className="... w-full max-w-[360px] px-6">  <!-- padding here -->
```

The issue is that **horizontal padding on a flex container affects how `justify-center` calculates the centering**. When `px-6` is applied to the outer container, the flex algorithm centers content within the padded area, but scrolling or overflow can cause the left padding to be clipped.

## Solution
Move the `px-6` padding from the outer flex container to the inner content container, matching the pattern used by PollCard.

## Changes Required

**File: `src/components/attendee/feed/cards/AnnouncementCard.tsx`**

1. Remove `px-6` from the outer container (line 13)
2. Add `px-6` to the inner content container (line 30)

**Before:**
```tsx
<div className="relative h-full w-full bg-[#09090b] overflow-hidden flex items-center justify-center px-6">
  ...
  <div className="relative z-10 w-full max-w-[340px] text-center animate-slide-up">
```

**After:**
```tsx
<div className="relative h-full w-full bg-[#09090b] overflow-hidden flex items-center justify-center">
  ...
  <div className="relative z-10 w-full max-w-[340px] px-6 text-center animate-slide-up">
```

This ensures the flex container can center its child without interference from padding, while the inner content still respects screen edge margins.
