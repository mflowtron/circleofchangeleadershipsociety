## Audit results (already verified)

- **Pages** (`src/pages`): only Album, Announcements, Auth, AuthCallback, Calendar, Chapters, Feed, Index, Moderation, MyChapter, NotFound, PendingApproval, Profile, Recordings, RootRouter, UserProfile, Users. No event/attendee/order/register pages remain.
- **Components**: only `album/`, `announcements/`, `feed/`, `layout/`, `moderation/`, `pwa/`, `recordings/`, `ui/`. No event/attendee/order/registration directories.
- **Edge functions**: only the 7 LMS ones (cleanup-album-orphans, moderate-content, mux-upload, mux-webhook, process-scheduled-notifications, register-push-token, send-push-notification).
- **Routes**: `/auth`, `/auth/callback`, `/pending-approval`, `/`, `/lms/*` only.
- **Sidebar**: only Feed / Recordings / Calendar / Album / My Chapter / Announcements / Users / Chapters / Moderation / Profile.
- **Grep sweep** for `attendee|conference|EventManagement|hasEMAccess|module_access|/events|/orders|/register|/attendee|EventSelectionContext|AttendeeContext`: only false positives (SW `registration`, `attendee_id` column on `announcement_analytics`, "review your registration" copy on PendingApproval). No event/attendee code paths remain.

Code cleanup is complete. Two leftover items worth flagging (not blocking):
1. `announcement_analytics.attendee_id` column still exists in DB (legacy name, stores the viewing user's id). Optional rename to `user_id` for clarity.
2. Storage buckets `event-images`, `badge-templates`, `speaker-images`, `chat-attachments` still exist (unused). Optional drop.

## Test plan

1. **Create test user** via `supabase--migration` — insert into `auth.users` + `profiles` with `is_approved=true, role='member'` (and a second admin user if needed for cross-checks).
2. **Open preview** with `browser--navigate_to_sandbox`, sign in as the test member.
3. **Smoke test each LMS surface**: Feed loads, Recordings loads, Calendar loads, Album loads, Announcements loads, Profile loads. Verify no console errors and no broken links to removed routes.
4. **Verify root redirect**: hitting `/` routes to `/lms` (or `/pending-approval` for unapproved users, `/auth` for signed-out).
5. **Sign in as admin**, confirm Users / Chapters / Moderation tabs render and the sidebar shows the admin nav set.
6. Report results; if anything fails, fix and re-test before closing out.

After approval I'll run the migration to seed test users, then drive the browser through the flows above.