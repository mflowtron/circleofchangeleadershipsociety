## Goal

Strip the codebase and backend down to the Society (LMS) app only. Remove all conference/event management, registration, attendee mobile app, and order/checkout code, plus the related database tables, edge functions, storage buckets, and roles.

## What stays (Society / LMS)

- Auth (`/auth`, `/auth/callback`, pending approval)
- LMS pages: Feed, Recordings (Mux), Profile, UserProfile, Users, Chapters, Moderation, MyChapter, Announcements (LMS-scoped), Calendar, Album
- Tables: `profiles`, `chapters`, `posts`, `post_interactions`, `recordings`, `recording_watch_progress`, `album_photos`, `album_photo_likes`, `album_photo_comments`, `calendar`, `announcements` (LMS-only), `announcement_analytics`, `push_subscriptions`, `push_notifications` (LMS-only)
- Storage buckets: `avatars`, `post-images`, `recording-resources`, `album-photos`
- Edge functions: `mux-upload`, `mux-webhook`, `moderate-content`, `send-push-notification`, `process-scheduled-notifications`, `register-push-token`

## What gets removed

### Frontend code
- Pages: `src/pages/events/**`, `src/pages/register/**`, `src/pages/orders/**`, `src/pages/attendee/**`, `src/pages/AreaSelector.tsx`
- Layouts: `src/layouts/EventsDashboardLayout.tsx`, `src/layouts/EventsLayout.tsx`
- Components: `src/components/events/**`, `src/components/attendee/**`, `src/components/announcements/` (event-specific bits), `src/components/orders/**`, `src/components/registration/**`, `src/components/feed/` event variants, `src/components/moderation/**` only if event-specific (kept for LMS posts), badge designer in `src/lib/badgePdfGenerator.ts`
- Contexts: `AttendeeAuthContext`, `AttendeeContext`, `AttendeeEventContext`, `AttendeeProviders`, `BookmarksContext`, `ConversationsContext`, `EventSelectionContext`
- Hooks: `useAgendaItems`, `useAttendees`, `useAttendeeProfile`, `useBadgeTemplates`, `useCalendar` (event one — keep LMS calendar hook), `useCheckins`, `useConversations`, `useEvents`, `useEventAnnouncements`, `useEventHotels`, `useFeedComments`, `useMessages`, `useNetworking`, `useOrderPortal`, `useOrders`, `useRegistration`, `useSpeakers`, `useTicketTypes`, `useNativelyPush` (only if attendee-only)
- Edge function clients, supabase config blocks, types regen
- `RootRouter` simplified: authenticated → `/lms`; unauth → `/auth`
- `Sidebar`, `Header`, `AppLayout`: drop dashboard switcher, area selector links, organizer/EM admin nav

### Edge functions to delete
`create-event-checkout`, `create-registration-checkout`, `create-dm-conversation`, `create-group-conversation`, `get-attendee-bookmarks`, `get-attendee-conversations`, `get-attendee-profile`, `get-conversation-messages`, `get-message-reactors`, `get-networkable-attendees`, `get-orders-by-email`, `get-registration-orders`, `join-event-chat`, `join-session-chat`, `manage-feed-comments`, `send-attendee-message`, `send-registration-forms`, `send-registration-otp`, `tally-webhook`, `toggle-attendee-bookmark`, `toggle-message-reaction`, `update-attendee-profile`, `update-attendee-public`, `update-registration-attendee`, `upload-chat-attachment`, `verify-event-payment`, `verify-registration-otp`, `verify-registration-payment`

### Database (single migration, in dependency order)
Drop tables: `attendee_checkins`, `attendee_bookmarks`, `attendees`, `order_items`, `order_access_codes`, `orders`, `ticket_types`, `agenda_items`, `speakers`, `messages`, `conversation_participants`, `conversations`, `feed_post_comments`, `events`

Drop columns: `announcements.event_id`, `announcements.audience_*`, `announcements.push_notification_id` (event push); `push_notifications.event_id`; `profiles.module_access` (no longer needed — single LMS).

Drop functions: `can_manage_events`, `is_event_owner`, `verify_order_edit_token`, `reserve_tickets`, `generate_order_number`, `ensure_attendee_user_link`, `update_announcement_analytics_counts` triggers if event-only

Roles: alter `user_role` enum to remove `'organizer'`. Re-map any existing organizer to `'member'` first.

Storage: delete buckets `event-images`, `badge-templates`, `speaker-images`, `chat-attachments` (and their objects).

### Secrets
Leave Stripe / Resend / Mux / OneSignal / Lovable AI keys alone (Mux + push are still used). No secret changes.

## Risk + irreversibility

This is destructive. Before running the migration I'll confirm row counts of `events`, `orders`, `attendees`, `messages` so you know what is being lost. There is no undo — once dropped, the data is gone.

## Execution order

1. **Migration** to drop event tables, columns, functions, role enum value, and storage buckets.
2. **Delete edge functions** (single batched call).
3. **Delete frontend files** (pages, components, contexts, hooks, layouts).
4. **Rewrite** `App.tsx`, `RootRouter.tsx`, `Sidebar.tsx`, `Header.tsx`, `AppLayout.tsx`, `AuthContext.tsx` (drop `hasEMAccess`, `hasModuleAccess`, role helpers tied to events).
5. **Clean up** `tailwind.config.ts` if any event-only tokens, remove orphan assets in `src/assets/events|hotels|speakers`, drop `docs/lovable-fix-public-events.md`, update `docs/DATA_DICTIONARY.md`.
6. **Memory pruning**: remove all event/attendee-related entries from `mem://index.md` and delete the corresponding memory files.
7. Verify build succeeds and `/` → `/lms` works.

After approval I'll start with the migration call so you can review the SQL before anything is dropped.
