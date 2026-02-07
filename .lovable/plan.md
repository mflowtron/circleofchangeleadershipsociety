

# Delete All Event Management Test Data

## Overview

Delete all test and demo data from the event management system. This requires deleting records in the correct order due to foreign key relationships.

## Data to Delete

| Table | Records | Description |
|-------|---------|-------------|
| `message_reactions` | 2 | Reactions on attendee messages |
| `attendee_messages` | 15 | Messages in conversations |
| `conversation_participants` | 7 | Participants in conversations |
| `attendee_conversations` | 5 | DM and group conversations |
| `attendee_bookmarks` | 4 | Bookmarked agenda items |
| `attendee_profiles` | 1 | Attendee networking profiles |
| `attendee_checkins` | 1 | Event check-in records |
| `attendees` | 21 | Individual attendee records |
| `order_messages` | 7 | Messages on orders |
| `order_items` | 14 | Line items on orders |
| `orders` | 14 | Purchase orders |
| `agenda_item_speakers` | 9 | Speaker assignments to sessions |
| `agenda_items` | 26 | Agenda sessions/breaks |
| `speakers` | 5 | Speaker profiles |
| `badge_templates` | 1 | Badge design templates |
| `event_hotels` | 2 | Hotel recommendations |
| `ticket_types` | 2 | Ticket type definitions |
| `events` | 1 | "First Gen 2026" event |

## Deletion Order (respecting foreign keys)

The records must be deleted in this order to avoid foreign key constraint violations:

1. **Messaging Data** (depends on attendees/speakers)
   - `message_reactions`
   - `attendee_messages`
   - `conversation_participants`
   - `attendee_conversations`

2. **Attendee Data** (depends on orders/agenda)
   - `attendee_bookmarks`
   - `attendee_profiles`
   - `attendee_checkins`
   - `attendees`

3. **Order Data** (depends on ticket_types)
   - `order_messages`
   - `order_items`
   - `orders`

4. **Agenda Data** (depends on speakers/events)
   - `agenda_item_speakers`
   - `agenda_items`

5. **Event Supporting Data** (depends on events)
   - `speakers`
   - `badge_templates`
   - `event_hotels`
   - `ticket_types`

6. **Events** (root table)
   - `events`

## SQL Script

```sql
-- 1. Messaging Data
DELETE FROM message_reactions;
DELETE FROM attendee_messages;
DELETE FROM conversation_participants;
DELETE FROM attendee_conversations;

-- 2. Attendee Data
DELETE FROM attendee_bookmarks;
DELETE FROM attendee_profiles;
DELETE FROM attendee_checkins;
DELETE FROM attendees;

-- 3. Order Data
DELETE FROM order_messages;
DELETE FROM order_items;
DELETE FROM orders;

-- 4. Agenda Data
DELETE FROM agenda_item_speakers;
DELETE FROM agenda_items;

-- 5. Event Supporting Data
DELETE FROM speakers;
DELETE FROM badge_templates;
DELETE FROM event_hotels;
DELETE FROM ticket_types;

-- 6. Events
DELETE FROM events;
```

## Important Notes

- This will delete the **"First Gen 2026"** event and ALL associated data
- This action is irreversible
- No user accounts or profiles will be affected
- LMS events, recordings, posts, and chapters are NOT affected

