
Goal
- Stop the “entire page (header + everything) shifts down with a blank gap at the top” bug after exiting fullscreen video in the iOS Natively wrapper.
- Make the fix resilient even when iOS/WKWebView does not reliably fire webkit fullscreen events.

What the screenshot + your answers indicate
- The entire layout is being displaced (not just extra header padding).
- The displacement persists until the screen is re-opened.
- This strongly points to a WKWebView viewport-origin/visualViewport desync (and/or a “stuck” offset) after native fullscreen exit.

Key finding in current code (why our previous “CSS anchor” likely did nothing)
- We add the class to the <html> element: document.documentElement.classList.add('is-natively-app')
- But our CSS currently tries to style “.is-natively-app html, .is-natively-app body”
  - That selector does NOT match because there is no <html> inside <html>.
  - So the “position: fixed” anchoring rules were never applied.
- Fixing this selector is necessary, but may still not be sufficient by itself.

Strategy (next iteration)
We’ll implement a “Viewport Compensation Layer” that:
1) Corrects the broken CSS selector so any intended anchoring applies in Natively.
2) Actively measures the viewport misalignment and applies a compensating translateY to the React root AND portal layers when the shift occurs (so the whole UI snaps back without needing a page/screen reopen).
3) Centralizes the logic in one place (the NativelySafeAreaProvider) to avoid overlapping competing monitors (currently we have logic in main.tsx and in the fullscreen hook).

Planned changes

A) Fix the Natively CSS selector and add a controlled compensation variable
File: src/index.css

1) Correct the selector so it actually applies to the html/body when html has the class:
- Replace:
  - .is-natively-app html,
  - .is-natively-app body
- With:
  - html.is-natively-app,
  - html.is-natively-app body
- And likewise ensure the #root selector is scoped correctly:
  - html.is-natively-app #root { ... }

2) Add a CSS variable for viewport compensation:
- On html.is-natively-app set:
  - --natively-viewport-compensation-y: 0px;

3) Apply that compensation to BOTH:
- #root (the full React app)
- common portal roots (Radix portals) so dialogs/toasts/lightboxes stay aligned too
  - e.g. body > div[data-radix-portal]
  - and any known toast container (Sonner) if it’s mounted outside #root
This avoids the “app is fixed but dialogs float in the wrong place” problem.

Resulting behavior:
- When we detect the viewport is shifted down by N px, we set:
  - --natively-viewport-compensation-y: -Npx
- The entire UI visually re-aligns instantly.

B) Move “viewport anomaly detection” into NativelySafeAreaProvider (single source of truth)
File: src/components/NativelySafeAreaProvider.tsx

1) Add a lightweight “sentinel” fixed element
- A hidden 1x1 fixed element at top:0 left:0
- This is used to measure if the coordinate space is misaligned:
  - rect.top should be 0
  - if rect.top > ~1, we’re shifted

2) Implement a monitor function that computes an offset and applies compensation
Compute offset using:
- Primary: window.visualViewport?.offsetTop (when available and meaningful)
- Secondary: sentinel.getBoundingClientRect().top (catches cases where offsetTop is 0 but the page is still visually displaced)
Pick the most reliable positive offset and clamp it to a safe range (e.g. 0..200) to avoid wild jumps.

Apply it by setting:
- document.documentElement.style.setProperty('--natively-viewport-compensation-y', `${-offset}px`)

3) When to run the monitor
- Always attach listeners only when running in Natively (same gate you already have).
- Listen to:
  - visualViewport resize
  - visualViewport scroll (some WKWebView issues manifest as “scroll” events)
  - orientationchange
  - visibilitychange
  - a custom event we dispatch after fullscreen exit (see section C)
- Additionally, after fullscreen exit is detected, run an “active settle window” for ~1–2 seconds:
  - rAF loop or short interval (e.g. every 50ms) to keep applying the compensation while WKWebView finishes its delayed layout adjustments.

4) Keep inset refreshing, but decouple it from the viewport compensation
- Continue refreshing insets, but the key is: even if insets are correct, we still compensate viewport shift.
- The monitor should run even if natively.getInsets fails or returns unchanged values.

C) Make fullscreen hook signal “fullscreen exit” reliably (don’t depend on webkitendfullscreen firing)
File: src/hooks/useFullscreenScrollFix.ts

We already listen to multiple sources, but we’ll adjust responsibilities:

1) On any probable “fullscreen ended” signal, dispatch a single event:
- window.dispatchEvent(new Event('natively:fullscreen-exit'))
- Also dispatch the existing:
  - natively:refresh-insets
This lets the Provider do the heavy lifting (compensation + settle window).

2) Reduce risky “scrollTo negative offset” behavior
- Keep a minimal scroll restoration if needed, but prioritize the new compensation approach.
- Excessive scroll resets can be counterproductive when the bug is not actually scroll position, but viewport origin.

D) Remove or gate the global viewport monitor in main.tsx (avoid conflicts)
File: src/main.tsx

Right now we have a visualViewport listener globally (even outside Natively) and it can compete with the provider and hook.
Plan:
- Remove it entirely, or gate it strictly behind the same “is native app” detection and then delegate to the provider via events.
Preferred:
- Remove it and let NativelySafeAreaProvider own all viewport correction logic.

E) Add an optional on-device debug overlay (to confirm the root cause quickly)
Files:
- src/components/NativelySafeAreaProvider.tsx (implementation)
- src/index.css (minimal styles)

Behavior:
- Only shows when a flag is set, e.g. localStorage.setItem('debugViewport', '1')
- Displays:
  - visualViewport.offsetTop
  - sentinel rect.top
  - current --natively-viewport-compensation-y
  - current --natively-inset-top
This will let us confirm in the Natively environment whether we’re compensating the exact amount and whether the shift is stable.

Testing plan (exact steps)
1) In Natively iOS:
- Open Recordings player
- Enter fullscreen
- Exit fullscreen
Expected:
- No persistent top gap
- If the shift happens for a split second, the UI snaps back within ~0–300ms (settle window keeps correcting)

2) Repeat quickly multiple times
- Enter/exit fullscreen 3–5 times
Expected:
- No accumulating offset

3) Open a dialog/toast after the bug would usually occur
Expected:
- Portals are aligned (because portal containers get the same translate compensation)

4) PWA sanity check
Expected:
- No changes (since html.is-natively-app won’t be present, and provider logic won’t run)

Why this should work when prior attempts didn’t
- The previous “anchor” CSS was effectively a no-op due to selector mismatch.
- We’ve been trying to “scroll/reset” a bug that’s fundamentally a viewport-origin misalignment.
- The new approach compensates visually for the misalignment directly, and does it from a central, always-mounted provider with an active settle window after fullscreen exit.

Files to be changed (summary)
- src/index.css
  - Fix selector: html.is-natively-app …
  - Add/apply --natively-viewport-compensation-y to #root and portal layers
- src/components/NativelySafeAreaProvider.tsx
  - Add sentinel + monitor + settle window
  - Listen for natively:fullscreen-exit and viewport events
  - Optional debug overlay
- src/hooks/useFullscreenScrollFix.ts
  - Dispatch natively:fullscreen-exit on any exit signal
  - De-emphasize negative scroll hacks in favor of compensation
- src/main.tsx
  - Remove or strictly gate the global viewport monitor to avoid conflicting behavior

Risk/edge cases
- Applying transforms can affect fixed/sticky behavior; we mitigate by applying the transform to the same root containers that own the UI and common portals so everything stays consistent.
- If the underlying bug stops producing a measurable offset, the monitor will keep compensation at 0 and do nothing.
- The debug overlay is optional and off by default.

Acceptance criteria
- After fullscreen exit in Recordings player on Natively iOS, the header is flush to the top with no persistent blank area.
- Issue does not require screen reopen to resolve.
- PWA behavior remains unchanged.
