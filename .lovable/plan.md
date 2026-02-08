
# Add Entrance Animation to Floating Action Button

## Overview
Add a subtle, playful entrance animation to the FAB that appears when the user navigates to the Feed. The animation will make the button feel alive and draw attention to the create post action.

## Approach
I'll create a custom "pop-in" animation that scales from 0 with a slight overshoot bounce effect, similar to native iOS/Android FAB animations. This will be paired with a short delay so the animation plays after the page content is visible.

## Changes

### 1. Add new keyframe and animation to Tailwind config

**File: `tailwind.config.ts`**

Add a new `fab-pop-in` keyframe with a bounce overshoot effect:
```text
keyframes: {
  ...
  "fab-pop-in": {
    "0%": { transform: "scale(0)", opacity: "0" },
    "60%": { transform: "scale(1.15)" },
    "80%": { transform: "scale(0.95)" },
    "100%": { transform: "scale(1)", opacity: "1" },
  },
}

animation: {
  ...
  "fab-pop-in": "fab-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards",
}
```

The timing uses:
- **0.4s duration** - quick but noticeable
- **cubic-bezier(0.34, 1.56, 0.64, 1)** - spring-like easing with overshoot
- **0.3s delay** - waits for page to settle before animating in
- **forwards** - maintains the final state

### 2. Apply animation to the FAB

**File: `src/components/attendee/feed/ConferenceFeed.tsx`**

Update the button's className to include the new animation and start with `opacity-0` so it's hidden before the animation plays:

```tsx
<button
  onClick={handleCreatePost}
  className="fixed right-4 z-40 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center touch-manipulation active:scale-95 transition-transform opacity-0 animate-fab-pop-in"
  style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
  aria-label="Create post"
>
```

## Result
The FAB will pop in with a satisfying bounce effect 0.3 seconds after the Feed loads, drawing the user's eye to the action button without being distracting.
