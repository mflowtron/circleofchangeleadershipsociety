## Findings

I audited every layer that could gate Society → Album access for an LMS user. Result: **the code already grants the Album tab to every LMS user.** No role gate is hiding it.

### Layer-by-layer check

1. **Route guard** (`src/App.tsx`, `/lms/album`)
   Wrapped in `<ProtectedRoute>` with **no `allowedRoles`** — only `requireApproval` is enforced. Any approved logged-in user passes.

2. **Sidebar link** (`src/components/layout/Sidebar.tsx`)
   `getNavItems()` returns one of three role variants — `admin`, `advisor`, `student` — and **all three include**:
   ```
   { path: '/lms/album', label: 'Album', icon: Images }
   ```
   `member` users fall through to `student`, so they get the link too.

3. **Database state** (all 22 profiles)
   ```text
   role=member   approved  module_access={lms}                 → 16 users  ✅
   role=admin    approved  module_access={lms,events,attendee} → 3 users   ✅
   role=admin    approved  module_access={lms}                 → 1 user    ✅
   role=organizer approved module_access={events}              → 2 users   (not LMS users — out of scope)
   ```
   Every LMS user is approved. None are missing `lms` in `module_access`.

4. **Data layer** (`useAlbumPhotos`)
   - `album_photos_safe` view: `authenticated` has SELECT (verified).
   - `album_photos` RLS SELECT policy: `USING (true)` for authenticated.
   - Storage policy `Album photos members can sign known photos` allows any authenticated user to sign URLs for paths that exist in `album_photos`.
   
   Nothing here is role-gated.

### Most likely real cause: stale PWA cache

This project ships as a PWA with a service worker. When the Album feature was added, the sidebar bundle changed. Users who haven't refreshed since then can be **stuck on a cached older shell** whose sidebar doesn't list "Album" — even though their account already has access. This matches the symptom "*some* users can't access" perfectly: it's not role-correlated, it's whoever opened the app before the Album shipped and never got the new bundle.

Memory `PWA Cache Management` says updates should be automated, but stale shells can persist if the SW didn't `skipWaiting`/refresh on that user's device.

## Proposed plan

### Step 1 — Confirm with the user (1 min, no code)
Ask the affected user to do one of:
- Pull-to-refresh / hard refresh the page, OR
- Close and reopen the app (Natively wrapper) / browser tab

If "Album" appears in their Society sidebar afterward, the diagnosis is confirmed and no code change is needed for *those* users.

### Step 2 — Make the cache update bullet-proof (code)
If users still don't see it after a refresh, harden the PWA update path:

- **`src/components/pwa/UpdateNotification.tsx`** — verify the update prompt actually triggers `skipWaiting` + reload when a new SW is detected. If it currently waits silently, change it to surface an unobtrusive "New version available — tap to refresh" toast that auto-applies on the next idle.
- **`vite.config.ts`** (Workbox) — confirm `registerType: 'autoUpdate'` and `clientsClaim: true` / `skipWaiting: true` are set so newly fetched service workers activate immediately on next load instead of waiting for all tabs to close.

These changes affect no business logic — they just guarantee the next sidebar update reaches everyone within one app open.

### Step 3 — (Optional, belt-and-suspenders) Force-refresh the link for current users
Bump the SW build hash (any trivial change in `vite.config.ts` triggers it) so all clients pick up the latest bundle on their next visit.

### What I will NOT change
- No RLS or role rewrites — they're already permissive enough.
- No new "Album" link added to the Events sidebar (per your clarification: LMS users only, which already works).
- No changes to `module_access` of any user.

## Technical summary

| Concern | Status |
|---|---|
| Route guard on `/lms/album` | Open to any approved user ✅ |
| Sidebar link in all LMS role variants | Present ✅ |
| `album_photos` SELECT RLS | `true` for authenticated ✅ |
| `album_photos_safe` view grants | `authenticated` has SELECT ✅ |
| Storage signed-URL RLS | Allows authenticated for any known photo ✅ |
| PWA cache freshness | **Likely culprit — needs hardening** ⚠️ |
