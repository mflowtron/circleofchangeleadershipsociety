## Diagnosis

The user `mflotron91@gmail.com` (id `6d8fab70…9f9a`) is correctly stored as `role='admin'` and `is_approved=true` in the `profiles` table, and only one row exists. The Supabase auth logs show their password login returning 200 cleanly. So the database and login itself are fine — the bug is in our client-side post-login routing.

There are three weak spots that, together, can trap an already-approved user on `/pending-approval`:

1. **`src/pages/Auth.tsx` does its own profile fetch right after `signInWithPassword` and navigates based on it.** If that single query returns nothing (transient error, race with the brand-new session, RLS edge case), the code falls back to `profileData?.is_approved ?? false` → `false`, and the user is sent to `/pending-approval` even though they're an approved admin. This duplicates work that `AuthContext` + `RootRouter` already do correctly.

2. **`src/pages/PendingApproval.tsx` only checks approval via `setInterval` every 10s** — there's no initial check on mount. Even when `AuthContext` later loads `is_approved=true`, the `/pending-approval` route guard (`isApproved ? <Navigate to="/" />`) only re-evaluates when `AuthContext` state changes; if the user landed there from Auth.tsx's local navigate before context was ready, they wait up to 10s for the poll. If the polled query also misses (same RLS / race issue), they appear permanently stuck.

3. **`AuthContext` swallows profile-fetch errors silently** (`const { data: profileData } = await supabase...`). When the fetch fails, `profile` becomes `null`, `isApproved` becomes `false`, and there's no retry — so a single hiccup leaves an admin looking unapproved for the rest of the session.

## Plan

### 1. `src/pages/Auth.tsx` — stop second-guessing AuthContext
- Remove the inline `profiles` query in `handleLogin`.
- After a successful `signInWithPassword`, just `navigate('/')`. `RootRouter` (with `AuthContext`) already routes to `/lms`, `/pending-approval`, or `/auth` based on the authoritative loaded profile.
- Keep the signup path as-is (new signups legitimately go to `/pending-approval`).

### 2. `src/contexts/AuthContext.tsx` — make profile loading reliable
- Capture and log the error from the profile select.
- On error or empty result, retry once after ~500ms (covers the brand-new-session race and the `handle_new_user` trigger lag) before giving up.
- Only set `loading=false` after the retry resolves so guarded routes don't render with a stale `isApproved=false`.

### 3. `src/pages/PendingApproval.tsx` — don't wait 10s for the first check
- Run `checkApproval()` immediately on mount in addition to the interval.
- If the query errors, log it (so we have a signal next time) instead of failing silently.

### 4. Verification
- Confirm in the DB that `mflotron91@gmail.com` remains `role=admin, is_approved=true` (already verified).
- After deploy, sign in as that user and confirm they land on `/lms` directly. Also sign in as the seeded `lovable-qa@coclc.org` member to confirm normal approved members still route correctly, and create a throwaway signup to confirm pending users still see `/pending-approval`.

### Out of scope
- No database, RLS, or migration changes — the data and policies are already correct.
- No changes to other pages, layouts, or LMS routes.

## Technical details

- Files touched: `src/pages/Auth.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/PendingApproval.tsx`.
- No new dependencies. No schema changes. Behavior change is limited to the login → routing handoff and the pending-approval screen's first-check timing.
