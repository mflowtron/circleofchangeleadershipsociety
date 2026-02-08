
## What’s actually causing the “Important Update” card to render off-screen

The Announcement card uses the class `animate-slide-up`.

Separately, **ScrollLockIndicator** also uses `animate-slide-up`, but it defines that class via an **inline `<style>` tag**:

- It injects a global CSS rule: `.animate-slide-up { animation: slide-up-indicator ... }`
- Its `@keyframes slide-up-indicator` sets `transform: translate(-50%, …)`
- That transform is perfect for the indicator (which is positioned with `left: 50%`), but it is disastrous for the AnnouncementCard content because it shifts the content left by 50% of its width.

Why it “fixes itself” after pressing **Acknowledge**:
- Acknowledging resolves the blocking state
- `ScrollLockIndicator` unmounts
- Its inline `<style>` disappears
- The AnnouncementCard’s `animate-slide-up` stops being overridden, so it centers correctly

So this is not a Tailwind timing issue anymore; it’s a **CSS class name collision + transform override**.

---

## Implementation plan (safe + minimal)

### 1) Remove the global `.animate-slide-up` override from `ScrollLockIndicator`
**File:** `src/components/attendee/feed/ScrollLockIndicator.tsx`

- Delete the inline `<style>` block entirely.
- Stop using `animate-slide-up` on the outer “fixed” indicator wrapper.
- Keep the outer wrapper responsible only for centering:
  - `fixed bottom-24 left-1/2 -translate-x-1/2 ...`
- Add a nested inner wrapper around the pill/bubble that gets the animation:
  - Apply `animate-slide-up` (Tailwind’s version) to this inner wrapper

This avoids any `transform` animation on the element that also needs `-translate-x-1/2`, and it prevents global CSS from clobbering other components.

**Result:** AnnouncementCard will no longer be pushed left when the scroll lock indicator is visible.

### 2) Confirm AnnouncementCard continues to use the Tailwind animation
**File:** `src/components/attendee/feed/cards/AnnouncementCard.tsx`

- No new layout changes required here.
- It can keep `animate-slide-up`; after step (1) it won’t be overridden anymore.

---

## How we’ll verify the fix (must-do checks)

1. Hard refresh / cold start the app and navigate to `/attendee/app/feed`.
2. Ensure the “Important Update” Announcement card is centered immediately (no clipping on the left).
3. While the feed is blocked (before acknowledging), confirm the “Scroll locked — interact to continue” pill still animates in subtly and remains centered.
4. Tap “Got it ✓” and confirm:
   - The announcement remains centered
   - The indicator disappears as expected
   - Auto-advance still works

---

## Notes / Edge cases handled

- This fix targets the real trigger: **indicator visible + global `.animate-slide-up` override**.
- It avoids introducing new Tailwind keyframes, and it removes fragile inline global CSS.
- It prevents future regressions where another component using `animate-slide-up` could be affected by the indicator’s styling.

---

## Files to change
- `src/components/attendee/feed/ScrollLockIndicator.tsx` (primary fix)
- (No functional changes required) `src/components/attendee/feed/cards/AnnouncementCard.tsx`

