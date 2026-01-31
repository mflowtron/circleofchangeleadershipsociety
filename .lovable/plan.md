
Goal
- Make the entire app (including the main header and any fixed/sticky UI like sidebars and toasts) respect iOS safe areas when running in Natively iOS preview with “Safe Area: Disabled”.

What’s actually going wrong (based on current code)
- Your main layouts scroll inside nested containers (`main` has `overflow-y-auto`), so the page itself doesn’t scroll.
- Headers are currently `position: sticky` with `top-0` (e.g., `src/components/layout/Header.tsx`, `src/components/events/EventsDashboardHeader.tsx`, `src/components/attendee/AttendeeLayout.tsx`, `src/layouts/EventsLayout.tsx`).
- In this setup, those sticky headers effectively anchor to the viewport top, not to the padded parent, so the parent’s `paddingTop: env(safe-area-inset-top)` is not reliably protecting the header from the notch/status bar.
- Result: header content still renders under the status bar in Natively iOS preview.

High-confidence fix strategy
1) Stop relying on “parent padding-top” to protect viewport-anchored elements.
2) Instead, move the viewport-anchored elements themselves down by the safe area inset:
   - For sticky headers: use `top: env(safe-area-inset-top)` (via a `top-safe` utility class).
   - For fixed elements pinned to the top (sidebars, toast viewport): also use `top-safe`, and adjust height to avoid extending past the bottom.
3) Make safe-area utilities robust by using CSS variables with both `constant()` and `env()` so older iOS WKWebView quirks don’t zero out the insets.

Implementation steps (code changes)
A) Create robust safe-area CSS variables (single source of truth)
- Update `src/index.css`:
  1. Add CSS variables on `:root`:
     - `--safe-top`, `--safe-right`, `--safe-bottom`, `--safe-left`
     - Define with both constant() and env() in the correct override order:
       - set `--safe-top: constant(safe-area-inset-top);` then `--safe-top: env(safe-area-inset-top);`
       - repeat for right/bottom/left
     - Also define `--safe-top: 0px` first as a baseline fallback.
  2. Refactor utility classes to use the variables and make them always available (not gated by `@supports`):
     - `.pt-safe { padding-top: var(--safe-top); }`
     - `.pb-safe { padding-bottom: var(--safe-bottom); }`
     - `.px-safe`, `.py-safe`, `.safe-all`
     - `.top-safe { top: var(--safe-top); }`
     - `.bottom-safe { bottom: var(--safe-bottom); }`
- Outcome: any environment that supports either constant() or env() will produce non-zero safe insets; anything else falls back to 0 without breaking layout.

B) Update all “top-of-screen” headers to use `top-safe` (not `top-0`)
- `src/components/layout/Header.tsx`
  - Change: `sticky top-0` -> `sticky top-safe`
  - Keep existing padding (px/py) as normal.
- `src/components/events/EventsDashboardHeader.tsx`
  - Change: `sticky top-0` -> `sticky top-safe`
- `src/layouts/EventsLayout.tsx`
  - Change: `sticky top-0` -> `sticky top-safe`
- `src/components/attendee/AttendeeLayout.tsx`
  - Change: `sticky top-0` -> `sticky top-safe`

Notes / why this is the key change
- This directly tells the header “your top edge starts below the notch”.
- It does not depend on parent padding behavior or scroll container behavior.

C) Update fixed “top-of-screen” components (sidebars, toast viewport) to respect safe top
- `src/components/layout/Sidebar.tsx`
  - Change class from `fixed top-0` to `fixed top-safe`
  - Remove the current inline `paddingTop: env(...)` (no longer needed if the whole sidebar is positioned below safe area).
  - Adjust height so it still fills the remaining screen:
    - Set `style={{ height: "calc(100dvh - var(--safe-top))" }}` (and keep left, width, etc. unchanged)
- `src/components/events/EventsDashboardSidebar.tsx`
  - Same changes as above: `top-0` -> `top-safe`, remove paddingTop, set height calc.
- `src/components/ui/toast.tsx`
  - Update ToastViewport: `fixed top-0` -> `fixed top-safe`
  - Keep `p-4`. This ensures toast stack begins below safe area on iOS.

D) Remove (or minimize) top-safe padding on layout wrappers to avoid double-offset
- Right now multiple layout roots apply `style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}`.
- After moving headers/sidebars themselves to `top-safe`, that root padding can cause a double gap on iOS devices (once the safe area variables start working properly).
- Update these layout root containers to remove the inline `paddingTop`:
  - `src/components/layout/AppLayout.tsx`
  - `src/layouts/EventsDashboardLayout.tsx`
  - `src/layouts/EventsLayout.tsx`
  - `src/components/attendee/AttendeeLayout.tsx`
  - Public pages where we currently used paddingTop for safe area (keep only if there is no header; otherwise remove):
    - `src/pages/Auth.tsx`
    - `src/pages/orders/Index.tsx`
    - `src/pages/orders/Dashboard.tsx`
- Rule of thumb we’ll apply:
  - If a screen has a top header that we moved to `top-safe`, do not also add a top safe-area padding on the root.
  - If a screen has no header and its first content can reach the top, add `pt-safe` (class-based) to that screen wrapper.

E) Add a temporary “Safe Area Debug Overlay” to verify values in the Natively previewer
Because this issue has persisted through multiple attempts, we’ll add an explicit diagnostic that makes it impossible to guess.
- Add a small component (e.g., `src/components/debug/SafeAreaDebug.tsx`) that:
  - Reads computed values of `--safe-top/right/bottom/left` via `getComputedStyle(document.documentElement).getPropertyValue(...)`
  - Displays them in a tiny fixed box at the top-left (also positioned with `top-safe` so it’s visible)
  - Only shows when a query param is present: `?debugSafeArea=1`
- Mount it near the root (e.g., inside `AppRoutes` in `src/App.tsx`) so you can open:
  - `/??debugSafeArea=1`
- This will confirm whether Natively’s iOS WebView is actually providing safe area inset values (and how large they are).

Files that will be changed
- Safe area foundation:
  - `src/index.css`
- Headers:
  - `src/components/layout/Header.tsx`
  - `src/components/events/EventsDashboardHeader.tsx`
  - `src/layouts/EventsLayout.tsx`
  - `src/components/attendee/AttendeeLayout.tsx`
- Fixed top elements:
  - `src/components/layout/Sidebar.tsx`
  - `src/components/events/EventsDashboardSidebar.tsx`
  - `src/components/ui/toast.tsx`
- Layout wrappers / page wrappers (remove inline paddingTop, switch to class-based where needed):
  - `src/components/layout/AppLayout.tsx`
  - `src/layouts/EventsDashboardLayout.tsx`
  - `src/pages/Auth.tsx`
  - `src/pages/orders/Index.tsx`
  - `src/pages/orders/Dashboard.tsx`
- Debug:
  - `src/components/debug/SafeAreaDebug.tsx` (new)
  - `src/App.tsx` (mount debug component behind query param)

How we’ll validate (very specific)
1) In Natively iOS previewer with Safe Area: Disabled:
   - Open `/??debugSafeArea=1`
   - Confirm safe top is non-zero (typically ~44–59px depending on device).
2) Verify on `/` (Feed route):
   - Header content (hamburger/avatar) is fully below the status bar.
   - No double-gap above header.
3) Open sidebar:
   - Sidebar top edge begins below notch (not behind it).
4) Trigger a toast:
   - Toast stack appears below notch.
5) Repeat in dark mode (status bar sync is already implemented; this is just visual confirmation).

Expected outcome
- The app will obey iOS safe areas in Natively previewer because viewport-anchored UI is offset by the actual safe inset, instead of depending on parent padding (which doesn’t reliably constrain sticky/fixed positioning in this app’s nested-scroll layout).
