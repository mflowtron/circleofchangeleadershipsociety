

# Schema Simplification - Incomplete Tasks

## Summary

The database migration was successfully created and applied, but **13 edge functions were NOT updated** to match the new schema. The TypeScript hooks and components appear to be correctly updated, but the edge functions still reference deleted tables and old column names.

---

## Completed Tasks

| Area | Status |
|------|--------|
| Database migration created (22 tables) | Done |
| Enum simplification (user_role, order_status, moderation_status) | Done |
| Table renames (posts, chapters, recordings, announcements) | Done |
| AuthContext updated with new role system | Done |
| TypeScript hooks updated (usePosts, useAgendaItems, useEventHotels, etc.) | Done |
| Components updated for new schema | Done |

---

## Incomplete Tasks - Edge Functions

### Critical: These 13 edge functions reference deleted tables or wrong column names

| Function | Issues |
|----------|--------|
| `get-attendee-profile` | References `attendee_profiles` table (DELETED) |
| `update-attendee-profile` | References `attendee_profiles` table (DELETED) |
| `get-networkable-attendees` | References `attendee_profiles` table and `attendees.order_id` (DELETED column) |
| `get-attendee-conversations` | References `attendee_conversations`, `attendee_messages`, `attendee_profiles`, `speaker_id` column |
| `send-attendee-message` | References `attendee_messages`, `attendee_conversations`, `attendee_profiles` |
| `get-conversation-messages` | References `attendee_messages`, `attendee_profiles`, `message_reactions` table, `sender_speaker_id` |
| `create-dm-conversation` | References `attendee_conversations`, `attendee_profiles`, `attendees.order_id`, `speaker_id` column |
| `join-session-chat` | References `attendee_conversations` (should be `conversations`) |
| `join-event-chat` | References `attendee_conversations` (should be `conversations`) |
| `create-group-conversation` | References `attendee_conversations`, `speaker_id` column |
| `toggle-message-reaction` | References `attendee_messages`, `message_reactions` table (should use JSONB) |
| `get-message-reactors` | References `attendee_messages`, `message_reactions` table, `attendee_profiles` |
| `verify-event-payment` | References `attendees.order_id`, `attendees.ticket_type_id`, `attendees.is_purchaser` (DELETED columns) |
| `create-event-checkout` | References `attendees.order_id`, `attendees.ticket_type_id`, `attendees.is_purchaser` (DELETED columns) |

---

## Required Changes per Edge Function

### 1. `get-attendee-profile/index.ts`
- Remove reference to `attendee_profiles` table
- Join `attendees.user_id` → `profiles` table instead
- Return profile data from `profiles` table (bio, company, title, open_to_networking)

### 2. `update-attendee-profile/index.ts`
- Remove reference to `attendee_profiles` table
- Update `profiles` table via `attendees.user_id` join
- Handle case where attendee has no linked user_id (cannot have profile)

### 3. `get-networkable-attendees/index.ts`
- Remove `attendees.order_id` reference → join through `order_items.order_id` instead
- Remove `attendee_profiles` reference → use `profiles` via `attendees.user_id`
- Use `profiles.open_to_networking` instead of `attendee_profiles.open_to_networking`

### 4. `get-attendee-conversations/index.ts`
- Change `attendee_conversations` → `conversations`
- Change `attendee_messages` → `messages`
- Remove `attendee_profiles` → use `profiles` via `attendees.user_id`
- Remove `sender_speaker_id` references (speakers now have attendee records with `is_speaker=true`)
- Remove `conversation_participants.speaker_id` references

### 5. `send-attendee-message/index.ts`
- Change `attendee_messages` → `messages`
- Change `attendee_conversations` → `conversations`
- Remove `attendee_profiles` → use `profiles`
- Change `sender_attendee_id` → `sender_id`

### 6. `get-conversation-messages/index.ts`
- Change `attendee_messages` → `messages`
- Remove `message_reactions` table → read from `messages.reactions` JSONB column
- Remove `attendee_profiles` → use `profiles`
- Remove `sender_speaker_id` references
- Change `sender_attendee_id` → `sender_id`

### 7. `create-dm-conversation/index.ts`
- Change `attendee_conversations` → `conversations`
- Remove `attendee_profiles` → use `profiles` via `attendees.user_id`
- Remove `attendees.order_id` reference
- Remove `speaker_id` from conversation_participants (speakers are now attendees with `is_speaker=true`)
- Change `created_by_attendee_id` → `created_by`

### 8. `join-session-chat/index.ts`
- Change `attendee_conversations` → `conversations`

### 9. `join-event-chat/index.ts`
- Change `attendee_conversations` → `conversations`

### 10. `create-group-conversation/index.ts`
- Change `attendee_conversations` → `conversations`
- Remove `speaker_id` from conversation_participants
- Change `created_by_attendee_id` → `created_by`

### 11. `toggle-message-reaction/index.ts`
- Change `attendee_messages` → `messages`
- Remove `message_reactions` table queries
- Read/write reactions from `messages.reactions` JSONB column
- Format: `{ "👍": ["attendee-uuid-1", "attendee-uuid-2"], "❤️": [...] }`

### 12. `get-message-reactors/index.ts`
- Change `attendee_messages` → `messages`
- Remove `message_reactions` table → read from `messages.reactions` JSONB
- Remove `attendee_profiles` → use `profiles`
- Remove `speaker_id` references

### 13. `verify-event-payment/index.ts`
- Remove `order_id`, `ticket_type_id`, `is_purchaser` from attendee insert
- Only insert `order_item_id`, `attendee_name`, `attendee_email`

### 14. `create-event-checkout/index.ts`
- Same as verify-event-payment: remove deleted columns from attendee insert

---

## Column/Table Mapping Reference

| Old Name | New Name |
|----------|----------|
| `attendee_conversations` | `conversations` |
| `attendee_messages` | `messages` |
| `attendee_profiles` | `profiles` (via `attendees.user_id`) |
| `message_reactions` (table) | `messages.reactions` (JSONB column) |
| `sender_attendee_id` | `sender_id` |
| `sender_speaker_id` | (removed - speakers are attendees) |
| `conversation_participants.speaker_id` | (removed) |
| `attendees.order_id` | (removed - use `order_item.order_id`) |
| `attendees.ticket_type_id` | (removed - use `order_item.ticket_type_id`) |
| `attendees.is_purchaser` | (removed) |
| `created_by_attendee_id` | `created_by` |

---

## Implementation Order

1. **Phase 1: Checkout Flow** (Critical for payments)
   - `create-event-checkout`
   - `verify-event-payment`

2. **Phase 2: Profile System**
   - `get-attendee-profile`
   - `update-attendee-profile`
   - `get-networkable-attendees`

3. **Phase 3: Messaging Core**
   - `send-attendee-message`
   - `get-conversation-messages`
   - `get-attendee-conversations`

4. **Phase 4: Conversation Management**
   - `join-session-chat`
   - `join-event-chat`
   - `create-dm-conversation`
   - `create-group-conversation`

5. **Phase 5: Reactions**
   - `toggle-message-reaction`
   - `get-message-reactors`

---

## Technical Notes

### Reactions JSONB Format
```json
{
  "👍": ["attendee-uuid-1", "attendee-uuid-2"],
  "❤️": ["attendee-uuid-3"],
  "😂": ["attendee-uuid-1"]
}
```

### Profile Access Pattern
```sql
-- Old: Direct attendee_profiles query
SELECT * FROM attendee_profiles WHERE attendee_id = ?

-- New: Join through attendees.user_id
SELECT p.* 
FROM attendees a
JOIN profiles p ON p.user_id = a.user_id
WHERE a.id = ?
```

### Order Access Pattern
```sql
-- Old: attendees.order_id
SELECT * FROM attendees WHERE order_id = ?

-- New: Through order_items
SELECT a.* 
FROM attendees a
JOIN order_items oi ON oi.id = a.order_item_id
WHERE oi.order_id = ?
```

