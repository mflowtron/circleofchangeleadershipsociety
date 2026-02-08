# Data Dictionary

This document provides a comprehensive reference for all database tables, columns, relationships, security policies, custom types, functions, and storage buckets in the Circle of Change Leadership Society platform.

**Last Updated:** February 2026  
**Total Tables:** 30  
**Total Functions:** 12  
**Storage Buckets:** 6

---

## Table of Contents

1. [User & Authentication](#1-user--authentication)
2. [Events](#2-events)
3. [Orders & Registration](#3-orders--registration)
4. [Attendee App](#4-attendee-app)
5. [Messaging](#5-messaging)
6. [LMS & Content](#6-lms--content)
7. [System](#7-system)
8. [Custom Types](#8-custom-types)
9. [Database Functions](#9-database-functions)
10. [Storage Buckets](#10-storage-buckets)

---

## 1. User & Authentication

### profiles

Stores user profile information for authenticated users. Automatically created on signup via the `handle_new_user()` trigger.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | References auth.users |
| full_name | text | No | - | Display name |
| avatar_url | text | Yes | - | Profile photo URL |
| headline | text | Yes | - | Short bio/title |
| linkedin_url | text | Yes | - | LinkedIn profile URL |
| chapter_id | uuid | Yes | - | Associated chapter |
| is_approved | boolean | No | false | Admin approval status |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**RLS Policies:**
- `Profiles viewable by authenticated users` (SELECT): All authenticated users can view profiles
- `Users can insert own profile` (INSERT): Users can create their own profile
- `Users can update own profile` (UPDATE): Users can modify their own profile
- `Admins can update any profile` (UPDATE): Admins can modify any profile

**Foreign Keys:**
- `chapter_id` → `lms_chapters.id`

---

### user_roles

Assigns application roles to users. Each user can have one role.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | References auth.users |
| role | app_role | No | 'student' | User's role |

**RLS Policies:**
- `Users can view own role` (SELECT): Users can see their own role; admins can see all
- `Admins can insert roles` (INSERT): Only admins can assign roles
- `Admins can update roles` (UPDATE): Only admins can change roles
- `Admins can delete roles` (DELETE): Only admins can remove roles

**Unique Constraint:** `user_id` (one role per user)

---

### lms_chapters

Organizational chapters/branches for grouping LMS users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Chapter name |
| description | text | Yes | - | Chapter description |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**RLS Policies:**
- `Chapters viewable by authenticated users` (SELECT): All authenticated users can view chapters
- `Admins can insert chapters` (INSERT): Only admins can create chapters
- `Admins can update chapters` (UPDATE): Only admins can modify chapters
- `Admins can delete chapters` (DELETE): Only admins can remove chapters

---

---

## 2. Events

### events

Core event information including dates, venue, and travel details.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| title | text | No | - | Event title |
| slug | text | No | - | URL-friendly identifier |
| short_description | text | Yes | - | Brief summary |
| description | text | Yes | - | Full description (markdown) |
| cover_image_url | text | Yes | - | Hero image URL |
| venue_name | text | Yes | - | Venue name |
| venue_address | text | Yes | - | Full address |
| starts_at | timestamptz | No | - | Event start time |
| ends_at | timestamptz | Yes | - | Event end time |
| travel_info | text | Yes | - | Travel instructions |
| travel_contact_email | text | Yes | - | Travel coordinator email |
| is_published | boolean | No | false | Public visibility |
| created_by | uuid | No | - | Event creator |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**RLS Policies:**
- `Published events are publicly visible` (SELECT): Anyone can see published events
- `Unpublished events visible to creator and admins` (SELECT): Draft visibility
- `Event organizers and admins can create events` (INSERT): Role-based creation
- `Event creator and admins can update events` (UPDATE): Owner/admin modification
- `Event creator and admins can delete events` (DELETE): Owner/admin deletion

**Unique Constraint:** `slug`

---

### ticket_types

Defines ticket tiers with pricing and availability for events.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | Parent event |
| name | text | No | - | Ticket name (e.g., "Early Bird") |
| description | text | Yes | - | Ticket benefits |
| price_cents | integer | No | 0 | Price in cents (0 = free) |
| quantity_available | integer | Yes | - | Max tickets (null = unlimited) |
| quantity_sold | integer | No | 0 | Tickets sold counter |
| max_per_order | integer | No | 10 | Maximum per transaction |
| sales_start_at | timestamptz | Yes | - | When sales begin |
| sales_end_at | timestamptz | Yes | - | When sales close |
| sort_order | integer | No | 0 | Display order |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**RLS Policies:**
- `Ticket types visible with published events` (SELECT): Public if event is published
- `Event owner and admins can create ticket types` (INSERT): Owner/admin creation
- `Event owner and admins can update ticket types` (UPDATE): Owner/admin modification
- `Event owner and admins can delete ticket types` (DELETE): Owner/admin deletion

**Foreign Keys:**
- `event_id` → `events.id`

---

### speakers

Speaker profiles for event sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | Parent event |
| name | text | No | - | Speaker name |
| title | text | Yes | - | Job title |
| company | text | Yes | - | Organization |
| bio | text | Yes | - | Biography |
| photo_url | text | Yes | - | Headshot URL |
| linkedin_url | text | Yes | - | LinkedIn profile |
| twitter_url | text | Yes | - | Twitter/X profile |
| website_url | text | Yes | - | Personal website |
| sort_order | integer | No | 0 | Display order |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**RLS Policies:**
- `Speakers visible with published events` (SELECT): Public if event is published
- `Event owner and admins can create speakers` (INSERT): Owner/admin creation
- `Event owner and admins can update speakers` (UPDATE): Owner/admin modification
- `Event owner and admins can delete speakers` (DELETE): Owner/admin deletion

**Foreign Keys:**
- `event_id` → `events.id`

---

### agenda_items

Sessions, breaks, and activities on the event schedule.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | Parent event |
| title | text | No | - | Session title |
| description | text | Yes | - | Session details |
| item_type | text | No | 'session' | Type: session, break, activity, keynote |
| starts_at | timestamptz | No | - | Start time |
| ends_at | timestamptz | Yes | - | End time |
| location | text | Yes | - | Room/venue |
| track | text | Yes | - | Track/category |
| is_highlighted | boolean | No | false | Featured session |
| sort_order | integer | No | 0 | Display order |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**RLS Policies:**
- `Agenda items visible with published events` (SELECT): Public if event is published
- `Event owner and admins can create agenda items` (INSERT): Owner/admin creation
- `Event owner and admins can update agenda items` (UPDATE): Owner/admin modification
- `Event owner and admins can delete agenda items` (DELETE): Owner/admin deletion

**Foreign Keys:**
- `event_id` → `events.id`

---

### agenda_item_speakers

Junction table linking speakers to agenda items with roles.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| agenda_item_id | uuid | No | - | Session |
| speaker_id | uuid | No | - | Speaker |
| role | text | No | 'speaker' | Role: speaker, moderator, panelist |
| sort_order | integer | No | 0 | Display order |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- `Agenda item speakers visible with agenda item` (SELECT): Follows parent visibility
- `Event owner and admins can manage agenda item speakers` (INSERT): Owner/admin creation
- `Event owner and admins can update agenda item speakers` (UPDATE): Owner/admin modification
- `Event owner and admins can delete agenda item speakers` (DELETE): Owner/admin deletion

**Foreign Keys:**
- `agenda_item_id` → `agenda_items.id`
- `speaker_id` → `speakers.id`

---

### event_hotels

Recommended hotels with booking information for events.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | Parent event |
| name | text | No | - | Hotel name |
| address | text | No | - | Full address |
| description | text | Yes | - | Hotel description |
| phone | text | Yes | - | Contact phone |
| rate_description | text | Yes | - | Room rates/group code |
| booking_url | text | Yes | - | Reservation link |
| image_url | text | Yes | - | Hotel photo |
| sort_order | integer | Yes | 0 | Display order |
| created_at | timestamptz | Yes | now() | Creation timestamp |

**RLS Policies:**
- `Anyone can view event hotels` (SELECT): Public access
- `Event owner and admins can insert hotels` (INSERT): Owner/admin creation
- `Event owner and admins can update hotels` (UPDATE): Owner/admin modification
- `Event owner and admins can delete hotels` (DELETE): Owner/admin deletion

**Foreign Keys:**
- `event_id` → `events.id`

---

### badge_templates

Badge design templates with configurable field positions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | Parent event (one per event) |
| background_image_url | text | Yes | - | Badge background |
| orientation | text | No | 'landscape' | landscape or portrait |
| fields | jsonb | No | '[]' | Field configurations (position, font, etc.) |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**RLS Policies:**
- `Users can view badge templates for events they can manage` (SELECT): Event managers only
- `Users can create badge templates for events they can manage` (INSERT): Event managers only
- `Users can update badge templates for events they can manage` (UPDATE): Event managers only
- `Users can delete badge templates for events they can manage` (DELETE): Event managers only

**Foreign Keys:**
- `event_id` → `events.id` (one-to-one)

---

## 3. Orders & Registration

### orders

Purchase records for event tickets.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | Event purchased |
| order_number | text | No | - | Human-readable ID (ORD-YYYYMMDD-NNNN) |
| full_name | text | No | - | Purchaser name |
| email | text | No | - | Purchaser email |
| phone | text | Yes | - | Contact phone |
| subtotal_cents | integer | No | 0 | Ticket total |
| fees_cents | integer | No | 0 | Processing fees |
| total_cents | integer | No | 0 | Grand total |
| status | order_status | No | 'pending' | Order state |
| stripe_payment_intent_id | text | Yes | - | Stripe reference |
| user_id | uuid | Yes | - | Logged-in purchaser (optional) |
| edit_token | uuid | Yes | gen_random_uuid() | Token for order modification |
| purchaser_is_attending | boolean | Yes | null | Whether the purchaser is personally attending |
| completed_at | timestamptz | Yes | - | When order was completed |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- `Anyone can create orders` (INSERT): Guest checkout allowed
- `Users can view own orders` (SELECT): Owner, admin, or event owner access
- `Admins and event owners can update orders` (UPDATE): Status changes

**Foreign Keys:**
- `event_id` → `events.id`

---

### order_items

Line items within an order (tickets purchased).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| order_id | uuid | No | - | Parent order |
| ticket_type_id | uuid | No | - | Ticket type |
| quantity | integer | No | 1 | Number of tickets |
| unit_price_cents | integer | No | - | Price per ticket |
| attendee_name | text | Yes | - | Legacy: single attendee name |
| attendee_email | text | Yes | - | Legacy: single attendee email |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- `Order items can be inserted with order` (INSERT): Open for checkout flow
- `Users can view own order items` (SELECT): Owner, admin, or event owner access

**Foreign Keys:**
- `order_id` → `orders.id`
- `ticket_type_id` → `ticket_types.id`

---

### attendees

Individual ticket holders within an order.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| order_id | uuid | No | - | Parent order |
| order_item_id | uuid | No | - | Line item |
| ticket_type_id | uuid | No | - | Ticket type |
| attendee_name | text | Yes | - | Attendee name |
| attendee_email | text | Yes | - | Attendee email |
| is_purchaser | boolean | No | false | Whether this attendee is the order purchaser |
| additional_info | jsonb | Yes | - | Custom fields |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**RLS Policies:**
- `Service role can insert attendees` (INSERT): Backend-only creation
- `Users can view attendees for own orders or as admin/organizer` (SELECT): Controlled access
- `Users can update attendees for own orders` (UPDATE): Name/email corrections

**Foreign Keys:**
- `order_id` → `orders.id`
- `order_item_id` → `order_items.id`
- `ticket_type_id` → `ticket_types.id`

---

### order_access_codes

Temporary codes for passwordless order management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| email | text | No | - | Email address (lowercase) |
| code | text | No | - | 6-digit code |
| expires_at | timestamptz | No | - | Expiration time |
| used_at | timestamptz | Yes | - | When code was used |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- None (service role only via edge functions)

**Usage:** Used for attendee app login and order portal access.

---

### order_messages

Communication thread between organizers and customers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| order_id | uuid | No | - | Related order |
| message | text | No | - | Message content |
| sender_type | text | No | 'organizer' | 'organizer' or 'customer' |
| sender_email | text | Yes | - | Customer email (if customer) |
| created_by | uuid | Yes | - | Admin user ID (if organizer) |
| is_important | boolean | No | false | Flag for priority |
| read_at | timestamptz | Yes | - | When message was read |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- `Admins and event organizers can view messages` (SELECT): Staff access
- `Authorized users can insert messages` (INSERT): Staff or customers
- `Message author can update own messages` (UPDATE): Edit capability
- `Admins can delete messages` (DELETE): Cleanup

**Foreign Keys:**
- `order_id` → `orders.id`

---

## 4. Attendee App

### attendee_profiles

Extended networking profiles for event attendees.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| attendee_id | uuid | No | - | Base attendee record |
| display_name | text | Yes | - | Preferred name |
| bio | text | Yes | - | Short biography |
| company | text | Yes | - | Organization |
| title | text | Yes | - | Job title |
| avatar_url | text | Yes | - | Profile photo |
| open_to_networking | boolean | Yes | false | Visibility in networking |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update timestamp |

**RLS Policies:**
- `Service role full access to profiles` (ALL): Edge function management
- `View open networking profiles` (SELECT): Public networking visibility

**Foreign Keys:**
- `attendee_id` → `attendees.id` (one-to-one)

---

### attendee_bookmarks

Saved agenda items (personal schedule builder).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| attendee_id | uuid | No | - | Attendee |
| agenda_item_id | uuid | No | - | Saved session |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- None (managed via edge functions)

**Foreign Keys:**
- `attendee_id` → `attendees.id`
- `agenda_item_id` → `agenda_items.id`

**Unique Constraint:** `(attendee_id, agenda_item_id)`

---

### attendee_checkins

Daily check-in records for event attendance tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| attendee_id | uuid | No | - | Attendee |
| event_id | uuid | No | - | Event |
| check_in_date | date | No | CURRENT_DATE | Date of check-in |
| checked_in_at | timestamptz | No | now() | Exact time |
| checked_in_by | uuid | Yes | - | Staff who checked in |
| notes | text | Yes | - | Check-in notes |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- `Event owners and admins can view check-ins` (SELECT): Staff access
- `Event owners and admins can create check-ins` (INSERT): Staff creation
- `Event owners and admins can update check-ins` (UPDATE): Corrections
- `Event owners and admins can delete check-ins` (DELETE): Undo check-in

**Foreign Keys:**
- `attendee_id` → `attendees.id`
- `event_id` → `events.id`

**Unique Constraint:** `(attendee_id, event_id, check_in_date)` (one check-in per day)

---

## 5. Messaging

### attendee_conversations

Chat threads for event networking (DM, group, event-wide, session-specific).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| event_id | uuid | No | - | Parent event |
| type | text | No | - | 'direct', 'group', 'event', 'session' |
| name | text | Yes | - | Conversation name (groups/events) |
| description | text | Yes | - | Conversation description |
| agenda_item_id | uuid | Yes | - | Session (for session chats) |
| created_by_attendee_id | uuid | Yes | - | Creator (attendee) |
| created_by_speaker_id | uuid | Yes | - | Creator (speaker) |
| is_archived | boolean | Yes | false | Soft delete |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last message time |

**RLS Policies:**
- `Service role full access to conversations` (ALL): Edge function management

**Foreign Keys:**
- `event_id` → `events.id`
- `agenda_item_id` → `agenda_items.id`
- `created_by_attendee_id` → `attendees.id`
- `created_by_speaker_id` → `speakers.id`

---

### conversation_participants

Members of a conversation with read status and muting.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| conversation_id | uuid | No | - | Conversation |
| attendee_id | uuid | Yes | - | Participant (attendee) |
| speaker_id | uuid | Yes | - | Participant (speaker) |
| role | text | Yes | 'member' | 'admin', 'member' |
| joined_at | timestamptz | Yes | now() | Join time |
| left_at | timestamptz | Yes | - | Leave time (null = active) |
| last_read_at | timestamptz | Yes | - | Last read marker |
| muted_until | timestamptz | Yes | - | Mute expiration |

**RLS Policies:**
- `Service role full access to participants` (ALL): Edge function management

**Foreign Keys:**
- `conversation_id` → `attendee_conversations.id`
- `attendee_id` → `attendees.id`
- `speaker_id` → `speakers.id`

---

### attendee_messages

Individual messages within conversations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| conversation_id | uuid | No | - | Parent conversation |
| content | text | No | - | Message text |
| sender_attendee_id | uuid | Yes | - | Sender (attendee) |
| sender_speaker_id | uuid | Yes | - | Sender (speaker) |
| reply_to_id | uuid | Yes | - | Replied message |
| attachment_url | text | Yes | - | File URL |
| attachment_type | text | Yes | - | MIME type |
| attachment_name | text | Yes | - | Original filename |
| attachment_size | integer | Yes | - | File size in bytes |
| is_deleted | boolean | Yes | false | Soft delete |
| created_at | timestamptz | Yes | now() | Sent time |
| updated_at | timestamptz | Yes | now() | Edit time |

**RLS Policies:**
- `Service role full access to messages` (ALL): Edge function management

**Foreign Keys:**
- `conversation_id` → `attendee_conversations.id`
- `sender_attendee_id` → `attendees.id`
- `sender_speaker_id` → `speakers.id`
- `reply_to_id` → `attendee_messages.id`

---

### message_reactions

Emoji reactions on messages.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| message_id | uuid | No | - | Message |
| emoji | text | No | - | Emoji character |
| attendee_id | uuid | Yes | - | Reactor (attendee) |
| speaker_id | uuid | Yes | - | Reactor (speaker) |
| created_at | timestamptz | Yes | now() | Reaction time |

**RLS Policies:**
- None (managed via edge functions)

**Foreign Keys:**
- `message_id` → `attendee_messages.id`
- `attendee_id` → `attendees.id`
- `speaker_id` → `speakers.id`

**Unique Constraint:** `(message_id, attendee_id, emoji)` or `(message_id, speaker_id, emoji)`

---

## 6. LMS & Content

### posts

Social feed posts with moderation support.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Author |
| content | text | No | - | Post text |
| image_url | text | Yes | - | Attached image |
| video_url | text | Yes | - | Attached video |
| video_aspect_ratio | text | Yes | - | Video dimensions |
| link_url | text | Yes | - | External link |
| is_global | boolean | No | true | Visible to all users |
| chapter_id | uuid | Yes | - | Chapter-specific post |
| moderation_status | moderation_status | Yes | 'pending' | Review status |
| moderation_score | real | Yes | - | AI moderation score |
| moderation_reasons | text[] | Yes | - | Flag reasons |
| moderated_at | timestamptz | Yes | - | Review time |
| moderated_by | uuid | Yes | - | Reviewer |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**RLS Policies:**
- `Users can view global posts and their chapter posts` (SELECT): Scoped visibility
- `Users can create posts` (INSERT): Authenticated users
- `Users can update own posts` (UPDATE): Owner, admin, or chapter advisor
- `Users can delete own posts or admins/advisors can moderate` (DELETE): Controlled deletion

**Foreign Keys:**
- `chapter_id` → `chapters.id`

---

### comments

Comments on posts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| post_id | uuid | No | - | Parent post |
| user_id | uuid | No | - | Author |
| content | text | No | - | Comment text |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- `Comments viewable with post access` (SELECT): Follows post visibility
- `Users can create comments` (INSERT): Authenticated users
- `Users can delete own comments` (DELETE): Owner or admin

**Foreign Keys:**
- `post_id` → `posts.id`

---

### likes

Post likes (one per user per post).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| post_id | uuid | No | - | Liked post |
| user_id | uuid | No | - | User who liked |
| created_at | timestamptz | No | now() | Like time |

**RLS Policies:**
- `Users can view own likes` (SELECT): Personal likes only
- `Users can like posts` (INSERT): Authenticated users
- `Users can unlike` (DELETE): Own likes only

**Foreign Keys:**
- `post_id` → `posts.id`

**Unique Constraint:** `(post_id, user_id)`

---

### announcements

System-wide announcements from admins.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| title | text | No | - | Announcement title |
| content | text | No | - | Full content |
| is_active | boolean | No | true | Currently displayed |
| expires_at | timestamptz | Yes | - | Auto-hide date |
| created_by | uuid | No | - | Admin author |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- `Announcements viewable by authenticated users` (SELECT): All users
- `Admins can insert announcements` (INSERT): Admin only
- `Admins can update announcements` (UPDATE): Admin only
- `Admins can delete announcements` (DELETE): Admin only

---

### lms_events

Scheduled learning events with meeting links.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| title | text | No | - | Event title |
| description | text | Yes | - | Event details |
| starts_at | timestamptz | No | - | Start time |
| ends_at | timestamptz | Yes | - | End time |
| meeting_link | text | Yes | - | Virtual meeting URL |
| is_active | boolean | No | true | Visible to users |
| created_by | uuid | No | - | Creator |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update timestamp |

**RLS Policies:**
- `Approved users can view active lms_events` (SELECT): Approved users only
- `Admins can view all lms_events` (SELECT): Admin override
- `Admins can insert lms_events` (INSERT): Admin only
- `Admins can update lms_events` (UPDATE): Admin only
- `Admins can delete lms_events` (DELETE): Admin only

---

### recordings

Video recordings with Mux integration for streaming.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| title | text | No | - | Recording title |
| description | text | Yes | - | Description |
| video_url | text | Yes | - | Legacy: direct URL |
| thumbnail_url | text | Yes | - | Preview image |
| mux_upload_id | text | Yes | - | Mux upload reference |
| mux_asset_id | text | Yes | - | Mux asset reference |
| mux_playback_id | text | Yes | - | Mux playback ID |
| status | text | Yes | 'pending' | Processing status |
| captions_status | text | Yes | - | Caption generation status |
| captions_track_id | text | Yes | - | Mux caption track |
| sort_order | integer | Yes | 0 | Display order |
| uploaded_by | uuid | No | - | Uploader |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- `Recordings viewable by authenticated` (SELECT): All authenticated users
- `Admins and advisors can upload recordings` (INSERT): Staff only
- `Admins can update recordings` (UPDATE): Admin only
- `Admins can delete recordings` (DELETE): Admin only

---

### recording_resources

Downloadable files attached to recordings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| recording_id | uuid | No | - | Parent recording |
| name | text | No | - | Display name |
| file_url | text | No | - | Download URL |
| file_type | text | No | - | MIME type |
| file_size | integer | No | 0 | Size in bytes |
| uploaded_by | uuid | No | - | Uploader |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- `Recording resources viewable by authenticated users` (SELECT): All authenticated
- `Admins and advisors can insert resources` (INSERT): Staff only
- `Admins and advisors can delete resources` (DELETE): Staff only

**Foreign Keys:**
- `recording_id` → `recordings.id`

---

## 7. System

### activity_logs

Audit trail of significant actions for admin monitoring.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| action | text | No | - | 'create', 'update', 'delete' |
| entity_type | text | No | - | Table/resource name |
| entity_id | uuid | No | - | Affected record ID |
| entity_title | text | Yes | - | Human-readable title |
| user_id | uuid | Yes | - | Acting user |
| user_name | text | Yes | - | User's name at time of action |
| metadata | jsonb | Yes | '{}' | Additional context |
| created_at | timestamptz | No | now() | Action timestamp |

**RLS Policies:**
- `Admins can view activity logs` (SELECT): Admin only

**Triggers:** Auto-populated by `log_*_activity()` trigger functions on various tables.

---

### push_subscriptions

Web push notification subscriptions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Subscribed user |
| endpoint | text | No | - | Push service URL |
| p256dh | text | No | - | Public key |
| auth | text | No | - | Auth secret |
| created_at | timestamptz | No | now() | Subscription time |

**RLS Policies:**
- `Users can view own subscriptions` (SELECT): Personal only
- `Admins can view all subscriptions` (SELECT): Admin override
- `Users can insert own subscriptions` (INSERT): Personal only
- `Users can delete own subscriptions` (DELETE): Personal only

---

## 8. Custom Types

### app_role

User role enumeration for permission management.

```sql
CREATE TYPE app_role AS ENUM ('admin', 'advisor', 'student', 'event_organizer');
```

| Value | Description |
|-------|-------------|
| admin | Full system access, user management, all events |
| advisor | Chapter management, content moderation for assigned chapters |
| student | Standard member access, posts, recordings |
| event_organizer | Can create and manage their own events |

---

### order_status

Order lifecycle states.

```sql
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
```

| Value | Description |
|-------|-------------|
| pending | Order created, awaiting payment |
| completed | Payment successful, tickets issued |
| cancelled | Order cancelled before completion |
| refunded | Payment refunded after completion |

---

### moderation_status

Content moderation workflow states.

```sql
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'flagged', 'auto_flagged');
```

| Value | Description |
|-------|-------------|
| pending | Awaiting review |
| approved | Cleared for display |
| flagged | Manually flagged by moderator |
| auto_flagged | Automatically flagged by AI moderation |

---

## 9. Database Functions

### Authentication & Authorization

#### handle_new_user()

**Trigger:** On `auth.users` INSERT  
**Purpose:** Auto-creates profile and assigns default 'student' role for new signups.

```sql
INSERT INTO public.profiles (user_id, full_name, is_approved)
INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
```

---

#### has_role(user_id uuid, role app_role) → boolean

**Purpose:** Checks if a user has a specific role.  
**Used by:** RLS policies throughout the system.

---

#### is_user_approved(user_id uuid) → boolean

**Purpose:** Checks if a user's profile is approved.  
**Used by:** LMS event visibility, protected content access.

---

#### can_manage_events(user_id uuid) → boolean

**Purpose:** Returns true if user is admin or event_organizer.  
**Used by:** Event creation RLS policies.

---

#### is_event_owner(user_id uuid, event_id uuid) → boolean

**Purpose:** Checks if user created a specific event.  
**Used by:** Event/ticket/speaker management policies.

---

#### is_advisor_for_chapter(user_id uuid, chapter_id uuid) → boolean

**Purpose:** Checks if user is an advisor for a specific chapter.  
**Used by:** Chapter-specific content moderation.

---

#### get_user_chapter(user_id uuid) → uuid

**Purpose:** Returns the chapter_id for a user.  
**Used by:** Post visibility RLS policies.

---

### Order Management

#### generate_order_number() → text

**Purpose:** Creates human-readable order numbers in format `ORD-YYYYMMDD-NNNN`.  
**Example:** `ORD-20260207-0001`

---

#### reserve_tickets(ticket_type_id uuid, quantity integer) → boolean

**Purpose:** Atomically reserves tickets with row-level locking.  
**Returns:** `true` if reservation succeeded, `false` if sold out.

```sql
-- Locks row, checks availability, increments quantity_sold
SELECT quantity_available, quantity_sold ... FOR UPDATE;
UPDATE ticket_types SET quantity_sold = quantity_sold + _quantity;
```

---

#### verify_order_edit_token(order_id uuid, token uuid) → boolean

**Purpose:** Validates order modification tokens for guest access.

---

### Utility Functions

#### log_activity(action, entity_type, entity_id, entity_title, user_id, metadata)

**Purpose:** Manually logs an activity to the audit trail.

---

#### get_post_like_count(post_uuid uuid) → integer

**Purpose:** Returns the number of likes on a post.

---

#### has_user_liked_post(post_uuid uuid) → boolean

**Purpose:** Checks if the current user has liked a post.

---

#### update_updated_at_column()

**Trigger:** BEFORE UPDATE on various tables  
**Purpose:** Automatically updates `updated_at` timestamp.

---

### Activity Logging Triggers

The following trigger functions automatically log activity:

| Function | Watches | Events |
|----------|---------|--------|
| log_profile_activity() | profiles | INSERT, UPDATE |
| log_post_activity() | posts | INSERT, UPDATE, DELETE |
| log_comment_activity() | comments | INSERT, DELETE |
| log_order_activity() | orders | INSERT, UPDATE |
| log_event_activity() | events | INSERT, UPDATE, DELETE |
| log_recording_activity() | recordings | INSERT, DELETE |
| log_announcement_activity() | announcements | INSERT, UPDATE, DELETE |

---

## 10. Storage Buckets

### post-images

**Public:** Yes  
**Purpose:** Images attached to social feed posts.

---

### avatars

**Public:** Yes  
**Purpose:** User profile photos and attendee profile photos.

---

### event-images

**Public:** Yes  
**Purpose:** Event cover images, speaker photos, hotel images.

---

### badge-templates

**Public:** Yes  
**Purpose:** Badge background images for event badges.

---

### recording-resources

**Public:** Yes  
**Purpose:** Downloadable files attached to recordings (PDFs, slides, etc.).

---

### chat-attachments

**Public:** Yes  
**Purpose:** Files shared in attendee messaging conversations.

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER & AUTH                                    │
│                                                                             │
│   auth.users ─────┬────► profiles ─────► chapters                           │
│                   │           │              ▲                              │
│                   │           └──────────────┤                              │
│                   └────► user_roles          │                              │
│                                              │                              │
│                          advisor_chapters ───┘                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                EVENTS                                       │
│                                                                             │
│   events ────┬──► ticket_types                                              │
│              │                                                              │
│              ├──► speakers ─────────┐                                       │
│              │                      │                                       │
│              ├──► agenda_items ─────┼──► agenda_item_speakers               │
│              │         │                                                    │
│              │         └──► attendee_conversations (session chats)          │
│              │                                                              │
│              ├──► event_hotels                                              │
│              │                                                              │
│              └──► badge_templates                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORDERS & ATTENDEES                                │
│                                                                             │
│   events ──► orders ──┬──► order_items ──► ticket_types                     │
│                       │         │                                           │
│                       │         └──► attendees ──► attendee_profiles        │
│                       │                   │                                 │
│                       │                   ├──► attendee_bookmarks           │
│                       │                   │                                 │
│                       │                   └──► attendee_checkins            │
│                       │                                                     │
│                       └──► order_messages                                   │
│                                                                             │
│   order_access_codes (passwordless auth)                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              MESSAGING                                      │
│                                                                             │
│   attendee_conversations ──┬──► conversation_participants                   │
│            │               │         (attendees OR speakers)                │
│            │               │                                                │
│            │               └──► attendee_messages ──► message_reactions     │
│            │                          │                                     │
│            │                          └──► (reply_to self-reference)        │
│            │                                                                │
│            └──► agenda_items (session chats)                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            LMS & CONTENT                                    │
│                                                                             │
│   posts ─────┬──► comments                                                  │
│      │       │                                                              │
│      │       └──► likes                                                     │
│      │                                                                      │
│      └──► chapters                                                          │
│                                                                             │
│   recordings ──► recording_resources                                        │
│                                                                             │
│   lms_events                                                                │
│                                                                             │
│   announcements                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               SYSTEM                                        │
│                                                                             │
│   activity_logs (audit trail)                                               │
│                                                                             │
│   push_subscriptions (web push)                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| Feb 2026 | 1.0 | Initial data dictionary created |
