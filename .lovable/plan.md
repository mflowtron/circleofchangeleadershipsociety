## Goal

Add structured, timestamped auth/routing logs so any future "stuck on pending approval" report can be diagnosed from the browser console alone.

## Approach

Create a tiny `src/utils/authLog.ts` helper that prefixes every entry with an ISO timestamp, a short tag (e.g. `[auth]`, `[routing]`), and — when available — the truncated `user_id`. Use a single `authLog(tag, event, fields)` function that emits `console.info` for normal events and `console.warn` / `console.error` for failures. This keeps call sites compact and grep-friendly (`[auth]`, `[routing]`).

Then instrument the five files that decide login + approval routing:

### `src/utils/authLog.ts` (new)
- `authLog(tag, event, fields?)`, `authWarn(...)`, `authError(...)`.
- Format: `2026-05-17T00:35:12.301Z [auth] event_name user=6d8fab70 key=value …`.
- No PII beyond `user_id` (truncated to first 8 chars).

### `src/contexts/AuthContext.tsx`
- On every `onAuthStateChange`: log event name, has-session, user_id.
- Around `loadProfile`: log `profile_fetch_start`, `profile_fetch_success` (with role + is_approved + chapter_id presence), `profile_fetch_empty`, `profile_fetch_retry`, `profile_fetch_error` (with full error object).
- On initial `getSession`: log result.
- On `signOut`: log it.

### `src/pages/RootRouter.tsx`
- Log every decision branch: `waiting_for_auth`, `redirect_auth` (no user), `redirect_pending` (with is_approved=false), `redirect_lms` (with role).

### `src/pages/Auth.tsx`
- Log `login_submit` (email only, no password), `login_success` (user_id), `login_error` (error.message), `signup_submit`, `signup_success`, `signup_error`.

### `src/pages/AuthCallback.tsx`
- Log callback entry, profile lookup outcome, retry attempt, final redirect target.

### `src/pages/PendingApproval.tsx`
- Log mount with user_id, each `approval_check` result (`still_pending` / `approved_redirecting` / `check_error`).

## Verification

- After deploy, open DevTools console and sign in as the QA member. Expect a clean trace ending in `[routing] redirect_lms role=member user=df0e63e8`.
- Force-fail the profile fetch (e.g. sign out + sign in with throttled network) and confirm the retry + error logs appear.
- If a real user reports being stuck again, ask them to copy the console — the log stream will pinpoint whether it was the fetch, the retry, the route decision, or something else.

## Out of scope

- No DB or RLS changes.
- No UI changes.
- No remote/log-aggregation pipeline — pure `console.*` so the user can read it from any browser session.

## Files touched

- `src/utils/authLog.ts` (new)
- `src/contexts/AuthContext.tsx`
- `src/pages/RootRouter.tsx`
- `src/pages/Auth.tsx`
- `src/pages/AuthCallback.tsx`
- `src/pages/PendingApproval.tsx`
