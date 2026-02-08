
# Fix Announcement Card Off-Screen Issue

## Root Cause
The AnnouncementCard component has an inline `<style>` tag at the **end of the JSX** that defines the `animate-slide-up` animation. This causes a rendering timing issue where:

1. The browser renders the content with `animate-slide-up` class applied
2. The inline styles haven't been parsed yet
3. The flex centering calculates layout based on the unanimated/undefined state
4. Once styles load, the animation plays but the container layout has already been calculated incorrectly

This explains why clicking "acknowledge" fixes it - the React re-render forces a fresh layout calculation after styles are properly loaded.

## Solution
Move the `slide-up` animation from inline CSS to Tailwind configuration, matching the pattern used for the FAB animation. This ensures the animation styles are available before the component renders.

## Changes

### 1. Add slide-up keyframe and animation to Tailwind config
**File: `tailwind.config.ts`**

Add to keyframes:
```typescript
"slide-up": {
  "0%": { opacity: "0", transform: "translateY(12px)" },
  "100%": { opacity: "1", transform: "translateY(0)" },
},
```

Add to animation:
```typescript
"slide-up": "slide-up 0.4s ease-out forwards",
```

### 2. Remove inline style tag from AnnouncementCard
**File: `src/components/attendee/feed/cards/AnnouncementCard.tsx`**

- Delete the inline `<style>` block (lines 100-115)
- Keep the `animate-slide-up` class on the content container - it will now use the Tailwind animation

## Technical Rationale

| Approach | Before | After |
|----------|--------|-------|
| Animation definition | Inline `<style>` in JSX | Tailwind config |
| Style availability | After render | Before render (in stylesheet) |
| Consistency | Unique to this component | Matches `fab-pop-in` pattern |
| Layout timing | Calculated before styles ready | Styles ready at first paint |

This ensures the browser knows about the animation keyframes before rendering the component, eliminating the layout timing issue.
