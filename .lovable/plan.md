
Problem recap (what’s still happening)
- In the Natively-wrapped app (not the PWA), exiting fullscreen in the Mux player causes the page to “jump” downward, leaving a large blank gap at the top.
- We previously added `useFullscreenScrollFix`, but it’s not resolving the issue in the Natively app.

What I found in the current implementation (root causes)
1) The fullscreen listeners often never attach in practice
- `useFullscreenScrollFix()` tries to attach iOS listeners to `playerRef.current?.media?.nativeEl` during its first `useEffect`.
- In `RecordingPlayerView`, `playerRef.current` is assigned inside the callback ref `handlePlayerRef`.
- Updating `playerRef.current` does not trigger a React re-render, so the hook’s effect will not re-run when the video element becomes available.
- Result: in many cases (especially in WebViews), `videoEl` is null at the moment we attach listeners, so `webkitbeginfullscreen` / `webkitendfullscreen` never get attached.

2) We’re restoring the wrong scroll position target
- The main app layout scrolls inside the `<main className="... overflow-y-auto">` container (see `src/components/layout/AppLayout.tsx`), not necessarily on `window`.
- The current hook only saves/restores `window.scrollY` via `window.scrollTo(...)`, which won’t fix a shift that is caused by the internal scrolling container’s `scrollTop` changing.

3) Natively safe-area insets are “one-and-done” (can become stale after fullscreen)
- In the PWA, `env(safe-area-inset-*)` updates dynamically as iOS changes UI chrome.
- In the Natively wrapper, we override safe area using `--natively-inset-*` which is set once on mount in `NativelySafeAreaProvider`.
- When iOS/WKWebView transitions in/out of fullscreen, the top inset/status bar can change. If the wrapper applies its own insets again after fullscreen exit, our CSS can effectively end up “double accounting” (native inset + our padding), creating the visible gap.
- Since the provider doesn’t refresh insets on lifecycle/viewport changes, it can’t correct itself.

Goal of the fix
- Make the fullscreen fix actually run in the Natively app by reliably attaching listeners after the video element exists.
- Restore the correct scroll container (internal `<main>` scroller) rather than only the window.
- Re-assert/update Natively safe-area insets immediately after fullscreen exits (and on relevant lifecycle events) so the top padding doesn’t drift.

Planned changes (code)
A) Harden `useFullscreenScrollFix` so it works in Natively WebView
File: `src/hooks/useFullscreenScrollFix.ts`

1. Attach listeners reliably
- Add a small “wait until available” mechanism:
  - Poll `playerRef.current?.media?.nativeEl` via a short interval for a few seconds, or use `requestAnimationFrame` looping until found (with timeout).
  - Once found, attach:
    - `webkitbeginfullscreen` (save)
    - `webkitendfullscreen` (restore)
  - Keep the current `fullscreenchange` listener as a fallback for non-iOS browsers.

2. Save/restore BOTH:
- window scroll: `window.scrollY`
- nearest scroll container scroll: `scrollContainer.scrollTop`
  - Determine scroll container at fullscreen start:
    - Traverse up from the video element to find the closest ancestor that is scrollable (computed overflowY is `auto`/`scroll` and scrollHeight > clientHeight).
    - If none found, fallback to `document.scrollingElement` or window.

3. Restore in multiple passes (iOS timing quirks)
- On fullscreen end:
  - Trigger a layout reflow (we can keep your existing “height nudge”, but we’ll make it safer and scoped).
  - Restore scroll in a few stages:
    - `requestAnimationFrame` restore
    - `setTimeout(50)` restore again
    - `setTimeout(250)` restore again (covers late WKWebView adjustments)

4. After fullscreen exit, force “insets + layout” refresh
- Dispatch a custom event (example: `window.dispatchEvent(new Event('natively:refresh-insets'))`)
- Also dispatch a synthetic resize event (`window.dispatchEvent(new Event('resize'))`) because some WebViews only respond to resize for viewport recalculation.

5. Add focused debug logging (temporary)
- Only when `window.natively` exists, log:
  - whether we found the native video element
  - whether `webkitbeginfullscreen` / `webkitendfullscreen` fired
  - which scroll container was chosen and its saved/restored values
This will let us confirm in the Natively console whether the events are firing (critical for debugging).

B) Update `NativelySafeAreaProvider` to refresh insets on changes
File: `src/components/NativelySafeAreaProvider.tsx`

1. Extract a `refreshInsets()` function inside the effect
- Calls `window.natively.getInsets(...)`
- Updates:
  - `--natively-inset-top/right/bottom/left`
- Keep the current try/catch behavior to avoid any blank-screen regressions.

2. Add event listeners to re-run `refreshInsets()`
- `resize`
- `orientationchange`
- `visibilitychange` (when returning from fullscreen, this can fire depending on the wrapper)
- custom event `natively:refresh-insets` (dispatched by the fullscreen hook)

3. Throttle/debounce refresh
- Prevent excessive calls by ignoring calls within e.g. 100ms windows.

Why this specifically targets “Natively only” behavior
- PWA: safe area comes from `env(...)` and iOS generally keeps it consistent across fullscreen transitions.
- Natively: safe area is a JS-fed CSS variable, and fullscreen transitions can change native insets/status bar behavior without our variables updating, leading to layout drift. Refreshing insets after exit addresses that.

C) (Optional but recommended) Expand the fix to Feed videos too
- The Feed’s `PostCard` uses `<MuxPlayer />` without a ref/hook.
- If the fullscreen-shift can also happen there in the Natively app, we should wrap MuxPlayer in a small reusable component that always applies the fullscreen fix, and use it in both:
  - `RecordingPlayerView`
  - `PostCard`
This reduces “it’s fixed here but not there” inconsistencies.

Testing plan (what I’ll verify after implementing)
1) In the Natively app (iOS):
- Go to Recordings -> open a recording -> enter fullscreen -> exit fullscreen.
- Confirm:
  - No persistent blank gap at the top
  - Header remains flush to the top (respecting safe area)
  - Scrolling still behaves normally (no snap-to-top surprises)

2) In the PWA:
- Repeat the same flow to ensure no regressions.

3) If we apply the optional Feed change:
- Open a post video -> fullscreen -> exit -> confirm no shift.

Risks / tradeoffs
- Polling for the native video element is slightly “hacky,” but it’s a common, reliable approach when refs update outside React state.
- Re-applying scroll restoration multiple times is intentionally defensive against WKWebView’s delayed viewport adjustments.
- Refreshing insets on resize/visibility changes should be safe, but we’ll throttle calls to avoid performance issues.

Implementation sequence (so we don’t break things)
1) Update `useFullscreenScrollFix` to reliably attach and to restore the correct scroll container.
2) Update `NativelySafeAreaProvider` to refresh insets + listen for the custom refresh event.
3) (Optional) Add a reusable MuxPlayer wrapper and use it in Feed posts.
4) Test in Natively and in PWA, and keep temporary debug logs until confirmed fixed, then remove/reduce them.
