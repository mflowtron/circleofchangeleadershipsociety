# Xano API Endpoints — Complete Migration Plan

This document maps every Supabase data access in the app to the Xano API endpoints needed to replace them. Endpoints are grouped by feature area. **Total: 55 endpoints.**

---

## 1. AUTH (4 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 1 | POST | `/auth/login` | `auth.signInWithPassword()` + profile fetch | Return `{ user, profile, token }` in one call |
| 2 | POST | `/auth/signup` | `auth.signUp()` + profile creation trigger | Create user + profile row, return `{ user, profile, token }` |
| 3 | POST | `/auth/logout` | `auth.signOut()` | Invalidate session |
| 4 | GET | `/auth/me` | `auth.getSession()` + `profiles.select()` | Return current user + profile. Called on app load and auth state change |

---

## 2. PROFILES (4 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 5 | GET | `/profiles/:userId` | `profiles.select().eq('user_id', id)` | Used by UserProfile page, RecordingDetails, comment/post author lookups |
| 6 | PATCH | `/profiles/:userId` | `profiles.update()` | Update own profile (name, headline, linkedin, etc.) |
| 7 | PATCH | `/profiles/:userId/avatar` | `storage.upload('avatars')` + `profiles.update({ avatar_url })` | Upload avatar file, store URL, update profile — single call |
| 8 | GET | `/profiles` | `profiles.select().in('user_id', [...])` or `.eq('chapter_id', id)` | Batch fetch profiles by user IDs or chapter. Used by feed author lookups, chapter members |

---

## 3. POSTS / FEED (6 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 9 | GET | `/posts?filter=all\|chapter\|mine` | 5 separate queries in `usePosts` (posts + profiles + 3x post_interactions) | Return hydrated posts with author info, like count, comment count, user_has_liked. **Biggest consolidation** |
| 10 | POST | `/posts` | `posts.insert()` + optional `storage.upload('post-images')` | Create post, upload image if present, return created post |
| 11 | DELETE | `/posts/:id` | `posts.delete()` | Delete own post |
| 12 | POST | `/posts/:id/like` | `post_interactions.insert({ type: 'like' })` | Toggle — like if not liked |
| 13 | DELETE | `/posts/:id/like` | `post_interactions.delete()` | Unlike |
| 14 | GET | `/posts/:id/comments` | `post_interactions.select().eq('type', 'comment')` + `profiles.select()` | Return comments with author info. Consolidates 2 queries from `useComments` |
| 15 | POST | `/posts/:id/comments` | `post_interactions.insert({ type: 'comment' })` | Add comment |
| 16 | DELETE | `/posts/comments/:id` | `post_interactions.delete()` | Delete own comment |

---

## 4. EVENTS (6 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 17 | GET | `/events` | `events.select().order('starts_at')` | All events (admin). Add `?published=true&upcoming=true` for public listing |
| 18 | GET | `/events/:idOrSlug` | `events.select().eq('slug', slug)` or `.eq('id', id)` | Single event by slug (public) or ID (admin). Includes `hotels` and `badge_template` jsonb |
| 19 | POST | `/events` | `events.insert()` | Create event |
| 20 | PATCH | `/events/:id` | `events.update()` | Update event. Also used for hotels jsonb and badge_template jsonb writes |
| 21 | DELETE | `/events/:id` | `events.delete()` | Delete event |
| 22 | POST | `/events/:id/images` | `storage.upload('event-images')` | Upload event-related image (speaker photo, hotel image, badge background). Return public URL |

---

## 5. SPEAKERS (4 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 23 | GET | `/events/:eventId/speakers` | `speakers.select().eq('event_id', id)` | All speakers for event |
| 24 | POST | `/events/:eventId/speakers` | `speakers.insert()` | Create speaker |
| 25 | PATCH | `/speakers/:id` | `speakers.update()` | Update speaker |
| 26 | DELETE | `/speakers/:id` | `speakers.delete()` | Delete speaker |

---

## 6. AGENDA (5 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 27 | GET | `/events/:eventId/agenda` | `agenda_items.select()` + `speakers.select().in('id', speakerIds)` | Return agenda items with populated speaker objects. Consolidates 2 queries from `useAgendaItems` |
| 28 | POST | `/events/:eventId/agenda` | `agenda_items.insert()` | Create agenda item |
| 29 | PATCH | `/agenda/:id` | `agenda_items.update()` | Update agenda item |
| 30 | DELETE | `/agenda/:id` | `agenda_items.delete()` | Delete agenda item |
| 31 | PATCH | `/events/:eventId/agenda/reorder` | Loop of `agenda_items.update({ sort_order })` | Batch reorder — accept `[{ id, sort_order }]` array |

---

## 7. TICKET TYPES (4 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 32 | GET | `/events/:eventId/ticket-types` | `ticket_types.select()` | All ticket types for event |
| 33 | POST | `/events/:eventId/ticket-types` | `ticket_types.insert()` | Create ticket type |
| 34 | PATCH | `/ticket-types/:id` | `ticket_types.update()` | Update ticket type |
| 35 | DELETE | `/ticket-types/:id` | `ticket_types.delete()` | Delete ticket type |

---

## 8. ORDERS & CHECKOUT (6 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 36 | GET | `/events/:eventId/orders` | `orders.select('*, order_items(*, ticket_type:ticket_types(name))')` | Orders with items and ticket type names |
| 37 | GET | `/orders/:id` | `orders.select('*, order_items(...)').eq('id', id).single()` | Single order with items |
| 38 | GET | `/orders?event_ids=a,b,c` | `orders.select().in('event_id', [...])` | Multi-event orders |
| 39 | POST | `/checkout` | Edge function `create-event-checkout` | Create order + reserve tickets + create Stripe session. Needs Stripe secret |
| 40 | POST | `/checkout/verify` | Edge function `verify-event-payment` | Verify Stripe payment, finalize order, create attendee records. Needs Stripe secret |
| 41 | POST | `/orders/:id/verify-token` | `rpc('verify_order_edit_token')` | Verify edit token for guest order access |
| 42 | GET | `/orders/by-email` | Edge function `get-orders-by-email` | Lookup orders by purchaser email (order portal) |

---

## 9. ATTENDEES (5 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 43 | GET | `/events/:eventId/attendees` | `attendees.select('*, order_item:order_items(*, ticket_type:ticket_types(*), order:orders(*))')` | Attendees with nested order/ticket info. Add `?stats=true` to include counts |
| 44 | GET | `/orders/:orderId/attendees` | `attendees.select().eq('order_item.order_id', orderId)` | Attendees for specific order |
| 45 | PATCH | `/attendees/:id` | `attendees.update()` | Update attendee name/email |
| 46 | PATCH | `/attendees/bulk` | Loop of `attendees.update()` | Batch update — accept array of `{ id, attendee_name, attendee_email }` |
| 47 | PATCH | `/attendees/:id/public` | Edge function `update-attendee-public` | Update attendee public info (name/email from order portal) |

---

## 10. ATTENDEE PROFILE & NETWORKING (4 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 48 | GET | `/attendee-profile/:attendeeId` | Edge function `get-attendee-profile` | Get attendee + linked profile data |
| 49 | PATCH | `/attendee-profile/:attendeeId` | Edge function `update-attendee-profile` | Update profile fields (bio, company, title, networking flag) |
| 50 | GET | `/events/:eventId/networking` | Edge function `get-networkable-attendees` | Attendees open to networking with profile info |
| 51 | POST | `/conversations/dm` | Edge function `create-dm-conversation` | Create DM between two attendees |

---

## 11. CHECK-INS (5 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 52 | GET | `/events/:eventId/checkins?date=YYYY-MM-DD` | `attendee_checkins.select('*, attendee:attendees(*, order_item:order_items(*, ticket_type:ticket_types(*)))')` | Checkins for event/date with attendee details. Consolidates complex nested query |
| 53 | GET | `/events/:eventId/checkin-stats` | 2 separate queries (attendees count + checkins count) | Return `{ total, checked_in, by_ticket_type }`. Consolidates 2 queries |
| 54 | POST | `/checkins` | `attendee_checkins.insert()` | Check in attendee |
| 55 | DELETE | `/checkins/:id` | `attendee_checkins.delete()` | Undo check-in |
| 56 | GET | `/attendees/:id/checkins` | `attendee_checkins.select().eq('attendee_id', id)` | Check-in history for single attendee |

---

## 12. BOOKMARKS (2 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 57 | GET | `/attendees/:id/bookmarks` | Edge function `get-attendee-bookmarks` | Get bookmarked agenda items |
| 58 | POST | `/attendees/:id/bookmarks/toggle` | Edge function `toggle-attendee-bookmark` | Toggle bookmark on/off for agenda item |

---

## 13. MESSAGING (8 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 59 | GET | `/conversations?attendee_id=X&event_id=Y` | Edge function `get-attendee-conversations` | List conversations with last message, unread count |
| 60 | GET | `/conversations/:id/messages` | Edge function `get-conversation-messages` | Paginated messages with sender info. Supports `?before=cursor&limit=50` |
| 61 | POST | `/conversations/:id/messages` | Edge function `send-attendee-message` | Send message (text or with attachment URL) |
| 62 | POST | `/conversations/:id/messages/attachment` | Edge function `upload-chat-attachment` | Upload file, return URL. Then call send-message with URL |
| 63 | POST | `/conversations/group` | Edge function `create-group-conversation` | Create group conversation |
| 64 | POST | `/conversations/join-event` | Edge function `join-event-chat` | Join or create event-wide chat |
| 65 | POST | `/messages/:id/reactions` | Edge function `toggle-message-reaction` | Toggle emoji reaction |
| 66 | GET | `/messages/:id/reactors?emoji=X` | Edge function `get-message-reactors` | Who reacted with specific emoji |

---

## 14. RECORDINGS & RESOURCES (5 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 67 | GET | `/recordings` | `recordings.select().eq('status', 'ready')` | List recordings |
| 68 | PATCH | `/recordings/reorder` | Loop of `recordings.update({ sort_order })` | Batch reorder |
| 69 | POST | `/recordings/upload` | Edge function `mux-upload` (action: create-upload) | Start Mux upload. Needs MUX_TOKEN_ID/SECRET |
| 70 | GET | `/recordings/:id/status` | Edge function `mux-upload` (action: check-status) | Check Mux processing status |
| 71 | DELETE | `/recordings/:id/asset` | Edge function `mux-upload` (action: delete-asset) | Delete Mux asset |
| 72 | POST | `/recordings/:id/resources` | `storage.upload('recording-resources')` + `recordings.update({ resources })` | Upload resource file, append to resources jsonb array |
| 73 | DELETE | `/recordings/:id/resources/:index` | `storage.remove()` + `recordings.update({ resources })` | Remove resource from storage and jsonb array |

---

## 15. POST VIDEO UPLOAD (2 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 74 | POST | `/posts/video-upload` | Edge function `mux-upload` (action: post-video-upload) | Start Mux upload for post video |
| 75 | GET | `/posts/video-status/:uploadId` | Edge function `mux-upload` (action: check-post-video) | Check post video processing status |

---

## 16. ANNOUNCEMENTS (4 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 76 | GET | `/announcements` | `announcements.select()` | All announcements (admin). Add `?active=true` for user-facing |
| 77 | POST | `/announcements` | `announcements.insert()` | Create announcement |
| 78 | PATCH | `/announcements/:id` | `announcements.update()` | Update announcement |
| 79 | DELETE | `/announcements/:id` | `announcements.delete()` | Delete announcement |

---

## 17. CHAPTERS (4 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 80 | GET | `/chapters` | `chapters.select()` | All chapters |
| 81 | POST | `/chapters` | `chapters.insert()` | Create chapter |
| 82 | PATCH | `/chapters/:id` | `chapters.update()` | Update chapter |
| 83 | DELETE | `/chapters/:id` | `chapters.delete()` | Delete chapter |

---

## 18. CALENDAR (4 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 84 | GET | `/calendar` | `calendar.select().order('starts_at')` | All calendar events |
| 85 | POST | `/calendar` | `calendar.insert()` | Create calendar event |
| 86 | PATCH | `/calendar/:id` | `calendar.update()` | Update calendar event |
| 87 | DELETE | `/calendar/:id` | `calendar.delete()` | Delete calendar event |

---

## 19. MODERATION (2 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 88 | GET | `/moderation/posts?status=pending\|flagged` | `posts.select()` + `profiles.select()` + `chapters.select()` | Posts needing moderation with author and chapter info. Consolidates 3 queries |
| 89 | POST | `/moderation/posts/:id` | Edge function `moderate-content` + `posts.update()` | Run moderation check, update status |

---

## 20. ADMIN USER MANAGEMENT (2 endpoints)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 90 | GET | `/admin/users` | `profiles.select()` + `chapters.select()` | All users with chapter names |
| 91 | PATCH | `/admin/users/:id` | `profiles.update()` | Update user role, chapter, approval status |

---

## 21. WEBHOOKS (1 endpoint)

| # | Method | Endpoint | Replaces | Notes |
|---|--------|----------|----------|-------|
| 92 | POST | `/webhooks/mux` | Edge function `mux-webhook` | Mux video processing callbacks. Needs MUX webhook secret |

---

## SUMMARY

| Feature Area | Endpoints | Consolidation Savings |
|---|---|---|
| Auth | 4 | Merges 6+ auth calls into 4 |
| Profiles | 4 | Merges scattered profile fetches |
| Posts/Feed | 8 | **5 queries → 1 per feed load** |
| Events | 6 | Straightforward |
| Speakers | 4 | Straightforward |
| Agenda | 5 | **2 queries → 1 per load** + batch reorder |
| Ticket Types | 4 | Straightforward |
| Orders & Checkout | 7 | Keeps Stripe integration |
| Attendees | 5 | **Nested joins → single calls** + batch update |
| Attendee Profile & Networking | 4 | Replaces edge functions |
| Check-Ins | 5 | **2 stats queries → 1** |
| Bookmarks | 2 | Replaces edge functions |
| Messaging | 8 | Replaces edge functions |
| Recordings | 7 | Keeps Mux integration |
| Post Video | 2 | Keeps Mux integration |
| Announcements | 4 | Straightforward |
| Chapters | 4 | Straightforward |
| Calendar | 4 | Straightforward |
| Moderation | 2 | **3 queries → 1** |
| Admin Users | 2 | **2 queries → 1** |
| Webhooks | 1 | Mux callback |
| **TOTAL** | **92** | |

---

## EXTERNAL SERVICE DEPENDENCIES

These endpoints need secrets/integrations configured in Xano:

| Service | Endpoints | Secrets Needed |
|---|---|---|
| **Stripe** | #39 `/checkout`, #40 `/checkout/verify` | `STRIPE_SECRET_KEY` |
| **Mux** | #69-71, #74-75, #92 | `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET` |
| **File Storage** | #7, #10, #22, #62, #72-73 | Xano native file storage or S3 bucket |

---

## MIGRATION ORDER RECOMMENDATION

### Phase 1 — Core (blocks everything)
Auth (#1-4), Profiles (#5-8), Events (#17-21)

### Phase 2 — Public Experience
Checkout (#39-42), Attendees (#43-47), Ticket Types (#32-35)

### Phase 3 — LMS
Posts/Feed (#9-16), Announcements (#76-79), Chapters (#80-83), Calendar (#84-87)

### Phase 4 — Attendee App
Messaging (#59-66), Bookmarks (#57-58), Check-Ins (#52-56), Attendee Profile (#48-51)

### Phase 5 — Event Management
Speakers (#23-26), Agenda (#27-31), Moderation (#88-89), Admin Users (#90-91)

### Phase 6 — Media
Recordings (#67-73), Post Video (#74-75), Mux Webhook (#92)
