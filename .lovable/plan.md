

# Create Data Dictionary Document

## Overview

Create a comprehensive data dictionary document (`docs/DATA_DICTIONARY.md`) containing detailed descriptions of all 30 database tables, their columns, data types, relationships, RLS policies, and custom types.

---

## Document Structure

The data dictionary will be organized into these sections:

1. **User & Authentication** (4 tables)
   - profiles, user_roles, chapters, advisor_chapters

2. **Events** (7 tables)
   - events, ticket_types, speakers, agenda_items, agenda_item_speakers, event_hotels, badge_templates

3. **Orders & Registration** (5 tables)
   - orders, order_items, attendees, order_access_codes, order_messages

4. **Attendee App** (3 tables)
   - attendee_profiles, attendee_bookmarks, attendee_checkins

5. **Messaging** (4 tables)
   - attendee_conversations, conversation_participants, attendee_messages, message_reactions

6. **LMS & Content** (7 tables)
   - posts, comments, likes, announcements, lms_events, recordings, recording_resources

7. **System** (2 tables)
   - activity_logs, push_subscriptions

8. **Custom Types**
   - app_role, order_status, moderation_status

9. **Database Functions** (12 functions)

10. **Storage Buckets** (6 buckets)

---

## Sample Table Entry Format

Each table entry will include:

```text
### table_name

Brief description of the table's purpose.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| ... | ... | ... | ... | ... |

**RLS Policies:**
- Policy descriptions

**Foreign Keys:**
- Relationships to other tables
```

---

## Key Tables Documented

### User & Authentication

| Table | Columns | Description |
|-------|---------|-------------|
| `profiles` | 10 | User profile with name, avatar, headline, chapter, approval status |
| `user_roles` | 3 | Role assignment (admin, advisor, student, event_organizer) |
| `chapters` | 5 | Organizational chapters/branches |
| `advisor_chapters` | 4 | Links advisors to chapters they manage |

### Events

| Table | Columns | Description |
|-------|---------|-------------|
| `events` | 16 | Core event data (title, dates, venue, travel info) |
| `ticket_types` | 13 | Ticket pricing and availability |
| `speakers` | 13 | Speaker profiles with social links |
| `agenda_items` | 13 | Sessions, breaks, activities with times and locations |
| `agenda_item_speakers` | 6 | Links speakers to sessions with roles |
| `event_hotels` | 11 | Recommended hotels with booking info |
| `badge_templates` | 6 | Badge designs with field configurations |

### Orders & Registration

| Table | Columns | Description |
|-------|---------|-------------|
| `orders` | 14 | Purchase records with payment status |
| `order_items` | 8 | Line items with quantities and prices |
| `attendees` | 8 | Individual ticket holders |
| `order_access_codes` | 6 | Temporary codes for order management |
| `order_messages` | 9 | Communication thread with customers |

### Attendee App

| Table | Columns | Description |
|-------|---------|-------------|
| `attendee_profiles` | 10 | Extended profiles for networking |
| `attendee_bookmarks` | 4 | Saved agenda items (personal schedule) |
| `attendee_checkins` | 8 | Daily check-in records |

### Messaging

| Table | Columns | Description |
|-------|---------|-------------|
| `attendee_conversations` | 11 | Chat threads (DM, group, event, session) |
| `conversation_participants` | 9 | Members with read status and muting |
| `attendee_messages` | 12 | Messages with attachments and replies |
| `message_reactions` | 6 | Emoji reactions to messages |

### LMS & Content

| Table | Columns | Description |
|-------|---------|-------------|
| `posts` | 16 | Social feed with moderation |
| `comments` | 5 | Post comments |
| `likes` | 4 | Post likes |
| `announcements` | 6 | System-wide announcements |
| `lms_events` | 10 | Scheduled learning events |
| `recordings` | 13 | Video recordings with Mux integration |
| `recording_resources` | 7 | Downloadable attachments |

### System

| Table | Columns | Description |
|-------|---------|-------------|
| `activity_logs` | 9 | Audit trail of actions |
| `push_subscriptions` | 6 | Web push notification subscriptions |

---

## Custom Types Reference

| Type | Values | Used By |
|------|--------|---------|
| `app_role` | admin, advisor, student, event_organizer | user_roles.role |
| `order_status` | pending, completed, cancelled, refunded | orders.status |
| `moderation_status` | pending, approved, rejected | posts.moderation_status |

---

## Database Functions Reference

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Auto-creates profile on signup |
| `has_role(user_id, role)` | Permission check |
| `is_user_approved(user_id)` | Approval status check |
| `can_manage_events(user_id)` | Event permission check |
| `is_event_owner(user_id, event_id)` | Ownership check |
| `generate_order_number()` | Creates ORD-YYYYMMDD-NNNN |
| `reserve_tickets(type_id, qty)` | Atomic ticket reservation |
| `log_activity(...)` | Audit logging helper |

---

## File to Create

| File | Description |
|------|-------------|
| `docs/DATA_DICTIONARY.md` | Complete data dictionary (~800 lines) |

