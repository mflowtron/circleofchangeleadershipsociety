# Lovable Prompt: Remove Dead Code and Unused Dependencies

> Paste everything below the divider into Lovable.

---

## PROMPT FOR LOVABLE

Remove unused dependencies, unused UI components, an unused hook, and a stale edge function. These are all dead code — none of them are imported or referenced by any feature in the app. This is safe cleanup with no behavioral changes.

---

### 1. Delete unused UI component files

These shadcn/ui wrapper components in `src/components/ui/` are never imported by any page, hook, or component in the app. Delete each file entirely:

- `src/components/ui/accordion.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/chart.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/menubar.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/pagination.tsx`
- `src/components/ui/resizable.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/slider.tsx`

Do NOT delete `toggle.tsx` — it is imported by `toggle-group.tsx`, which is used.

---

### 2. Uninstall unused npm packages

These packages are only imported by the UI wrapper components being deleted above. Remove them from `package.json` dependencies:

- `embla-carousel-react`
- `input-otp`
- `react-resizable-panels`
- `recharts`
- `vaul`

Do NOT remove `cmdk` — it is used by `SpeakerSelector.tsx` via `command.tsx`.

---

### 3. Delete unused hook

Delete `src/hooks/useAttendeeBookmarks.ts` — it is never imported by any component in the app.

---

### 4. Delete stale edge function

Delete the entire `supabase/functions/backfill-video-aspect-ratios/` directory. This was a one-time data migration script and is not called from any application code.

---

### What NOT to change

- Do not remove `natively` — the app will be wrapped as a native app
- Do not remove `cmdk` or `src/components/ui/command.tsx` — used by `SpeakerSelector.tsx`
- Do not remove `toggle.tsx` — imported by `toggle-group.tsx`
- Do not change any application logic, routes, hooks, or edge functions beyond what is listed above
- The app should build and function identically after these deletions
