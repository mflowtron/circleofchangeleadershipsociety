## Audit results — important findings

Before doing anything, I checked the live database and found **the destructive migration is almost entirely unnecessary** — the backend has already been stripped:

**Tables that exist (15):** `album_photo_comments`, `album_photo_likes`, `album_photos`, `album_photos_safe` (view), `announcement_analytics`, `announcements`, `calendar`, `chapters`, `post_interactions`, `posts`, `profiles`, `push_notifications`, `push_subscriptions`, `recording_watch_progress`, `recordings`. **All event/order/attendee/messaging tables are already gone.**

**Columns already cleaned:**
- `announcements` — no `event_id`, no `audience_*`, no `push_notification_id`
- `push_notifications` — no `event_id` (does still have `audience_filter` / `audience_type`, harmless)
- `profiles` — no `module_access` column (the AuthContext code referencing it is already querying a phantom column)

**Enum already cleaned:** `user_role` is `{admin, advisor, member}` — `organizer` already removed.

**Storage buckets still present:** `event-images`, `badge-templates`, `speaker-images`, `chat-attachments` need deletion. Keep `avatars`, `post-images`, `recording-resources`, `album-photos`.

**Edge functions present (35):** of these, 28 should be deleted; keep `cleanup-album-orphans`, `moderate-content`, `mux-upload`, `mux-webhook`, `process-scheduled-notifications`, `register-push-token`, `send-push-notification`.

**Row counts of "lost" data:** zero — tables don't exist, nothing to lose.

## Revised execution plan

### 1. Database migration (small — storage only)

Single migration that:
- Removes the 4 unused storage buckets and any objects in them: `event-images`, `badge-templates`, `speaker-images`, `chat-attachments`.
- (Optional belt-and-suspenders) `DROP FUNCTION IF EXISTS` for any leftover event helpers (`can_manage_events`, `is_event_owner`, `verify_order_edit_token`, `reserve_tickets`, `generate_order_number`, `ensure_attendee_user_link`) — safe no-op if absent.

No table drops, no column drops, no enum changes — already done.

### 2. Delete 28 edge functions in one batched call

`create-event-checkout`, `create-registration-checkout`, `create-dm-conversation`, `create-group-conversation`, `get-attendee-bookmarks`, `get-attendee-conversations`, `get-attendee-profile`, `get-conversation-messages`, `get-message-reactors`, `get-networkable-attendees`, `get-orders-by-email`, `get-registration-orders`, `join-event-chat`, `join-session-chat`, `manage-feed-comments`, `send-attendee-message`, `send-registration-forms`, `send-registration-otp`, `tally-webhook`, `toggle-attendee-bookmark`, `toggle-message-reaction`, `update-attendee-profile`, `update-attendee-public`, `update-registration-attendee`, `upload-chat-attachment`, `verify-event-payment`, `verify-registration-otp`, `verify-registration-payment`.

Also `rm -rf` their `supabase/functions/<name>/` source dirs.

### 3. Delete frontend code

**Pages:** `src/pages/events/**`, `src/pages/register/**`, `src/pages/orders/**`, `src/pages/attendee/**`, `src/pages/AreaSelector.tsx`.

**Layouts:** `src/layouts/EventsDashboardLayout.tsx`, `src/layouts/EventsLayout.tsx`.

**Components:** `src/components/events/**`, `src/components/attendee/**`, `src/components/orders/**`, `src/components/registration/**`. Keep `src/components/announcements/**`, `src/components/feed/**`, `src/components/moderation/**`, `src/components/recordings/**`, `src/components/album/**` (all LMS).

**Contexts:** `AttendeeAuthContext`, `AttendeeContext`, `AttendeeEventContext`, `AttendeeProviders`, `BookmarksContext`, `ConversationsContext`, `EventSelectionContext`.

**Hooks (delete):** `useAgendaItems`, `useAttendees`, `useAttendeeProfile`, `useBadgeTemplates`, `useCheckins`, `useConversations`, `useEvents`, `useEventAnnouncements`, `useEventHotels`, `useFeedComments`, `useMessages`, `useNetworking`, `useOrderPortal`, `useOrders`, `useRegistration`, `useSpeakers`, `useTicketTypes`, `useNativelyPush`, `useNativelyThemeSync`, `useNativelySafeArea`, `useIsNativeApp`, `useSwipeGesture`, `usePullToRefresh`, `useNavigationDirection`, `usePushNotifications` (event-targeted variant — verify), `useAnnouncements` keep (LMS).

**Hooks (keep — LMS):** `useAlbumPhotos`, `useAlbumLikes`, `useAlbumComments`, `useAnnouncements`, `useCalendar`, `useComments`, `usePosts`, `useUserPosts`, `useRecordingResources`, `useTranscript`, `useWatchProgress`, `use-mobile`.

**Lib:** `src/lib/badgePdfGenerator.ts`. Keep `calendarUtils.ts`, `fileUtils.ts`, `timezoneUtils.ts`, `utils.ts`.

**Types:** `src/types/registration.ts`, `src/types/conferenceFeed.ts`, `src/types/feedViewState.ts`. Keep `album.ts`.

**Utils:** `src/utils/nativelyCache.ts` (if attendee-only).

**Data:** `src/data/conferenceFeedData.ts`.

**Assets:** purge `src/assets/events|hotels|speakers` directories if present.

### 4. Rewrite core files

- **`AuthContext.tsx`** — drop `module_access`, `hasModuleAccess`, `hasEMAccess`, `hasAttendeeAccess`, all `isEM*` legacy helpers, and the `module_access` column from the profile select. Keep `isAdmin`, `isLMSAdmin`, `isLMSAdvisor`, `isLMSStudent`, `isApproved`, `signOut`, `profile`, `session`, `user`, `loading`.
- **`RootRouter.tsx`** — collapse to: not-logged-in → `/auth`; not-approved → `/pending-approval`; otherwise → `/lms`.
- **`App.tsx`** — drop all `events/*`, `register/*`, `orders/*`, `attendee/*` lazy imports + routes, remove `EventSelectionProvider`, remove `select-dashboard`, remove `useEventsLayout` branch and `em_*` role mapping in `ProtectedRoute`.
- **`Sidebar.tsx` / `Header.tsx` / `AppLayout.tsx`** — remove dashboard switcher, area-selector links, organizer/EM nav entries. LMS-only nav.
- **`pages/Auth.tsx`, `AuthCallback.tsx`** — verify post-auth redirect goes to `/lms` (or `/`).

### 5. Cleanup & docs

- Remove `supabase/config.toml` per-function blocks for deleted functions.
- Delete `docs/lovable-fix-public-events.md`.
- Update `docs/DATA_DICTIONARY.md` to reflect 15-table LMS-only schema.
- Tailwind config — sweep for tokens only used by event pages (likely none, palette is shared).

### 6. Memory pruning (`mem://`)

Delete files referenced in the index that are event/attendee-only:
- `mem://design/event-detail-landing-page`, `mem://design/attendee-app/*` (5 files), `mem://constraints/event-attendee-information`, `mem://constraints/badge-printing-fidelity`, `mem://constraints/attendee-app/feed-access`, `mem://features/event-*` (agenda, agenda-calendar, checkin, checkin-ux, timezone, image-fallback, orders-dashboard, ticket-attendance, attendee-agenda-detail, attendee-mobile-app-environment, push-notifications-system, attendee-app/* — 6 files), `mem://features/announcements/event-scoped`, `mem://features/lms-internal-events`, `mem://features/user-approval-workflow` (keep — LMS uses approval), `mem://features/push-notifications/cancellation-logic`, `mem://architecture/event-*`, `mem://architecture/ticket-inventory-management`, `mem://architecture/messaging-*`, `mem://architecture/attendee-*`, `mem://architecture/announcements/*`, `mem://architecture/contextual-profile-routing`, `mem://architecture/global-dashboard-switching`, `mem://architecture/event-selection-persistence`, `mem://architecture/user-access-control`, `mem://architecture/attendee-record-structure`, `mem://architecture/database-attendee-relationship-path`, `mem://architecture/module-access/attendee-app-restriction`, `mem://architecture/storage/album-photos-private` (keep — LMS), `mem://architecture/mobile-safe-area-handling`, etc.

Then rewrite `mem://index.md` Core + Memories sections to retain only: auth (single `/auth`, magic link/email-password), Society design, RLS pattern, PWA, Mux, Album, Recordings, Feed, Moderation, Calendar, Announcements (LMS), Push notifications (LMS-scoped subset), Chapters, Users.

### 7. Verify

- Build succeeds, no TS errors, no dead imports.
- `/` redirects to `/lms`.
- `/auth` works, post-login lands on `/lms`.
- Album, Recordings, Feed, Calendar, Announcements, Moderation, Users, Chapters, MyChapter, Profile all load.

## Risk

Low. Backend already stripped — no row-loss risk. Frontend deletion is mechanical; the only judgement calls are (a) which `useNativelyPush`-style mobile hooks are still pulled in by surviving LMS code (I'll grep before deleting each one) and (b) the `AuthContext` rewrite must drop the phantom `module_access` select that's silently failing today.

After approval I'll start with the small storage-cleanup migration so you can review the SQL, then proceed through edge function deletion, frontend purge, rewrites, and memory pruning.
