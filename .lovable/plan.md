

# Add Group and Direct Messaging to Attendee App

## Overview

Implement a fully-featured real-time messaging system for the attendee mobile app (`/attendee`) that enables:
- **Direct messages** between attendees and speakers at the same event
- **Group chats**: Event-wide, session-based, and custom attendee-created groups
- **Privacy controls**: Opt-in "Open to Networking" setting for discoverability
- **Real-time updates** via Supabase Realtime

---

## Architecture

```text
                         MESSAGING SYSTEM
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Direct    │    │   Group     │    │   Session   │         │
│  │   Messages  │    │   Chats     │    │   Chats     │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────┬───────┴──────────────────┘                 │
│                    │                                            │
│         ┌──────────▼──────────┐                                │
│         │  Supabase Realtime  │                                │
│         │   (Live Updates)    │                                │
│         └──────────┬──────────┘                                │
│                    │                                            │
│  ┌─────────────────▼─────────────────────────────────────────┐ │
│  │                   DATABASE TABLES                          │ │
│  │  • attendee_conversations (DM threads)                     │ │
│  │  • conversation_participants (who's in each convo)         │ │
│  │  • attendee_messages (all messages)                        │ │
│  │  • attendee_profiles (networking opt-in, avatar)           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Tables

| Table | Purpose |
|-------|---------|
| `attendee_profiles` | Extended profile with networking opt-in, avatar, bio |
| `attendee_conversations` | Conversation metadata (DM, group, session-based) |
| `conversation_participants` | Maps attendees/speakers to conversations |
| `attendee_messages` | Individual messages with read receipts |
| `message_read_receipts` | Track who has read which message |

### Table Details

**attendee_profiles** - Networking profile for attendees
```sql
CREATE TABLE public.attendee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  company TEXT,
  title TEXT,
  open_to_networking BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(attendee_id)
);
```

**attendee_conversations** - Conversation/thread container
```sql
CREATE TABLE public.attendee_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'session', 'event')),
  name TEXT, -- For group chats
  description TEXT, -- Optional group description
  agenda_item_id UUID REFERENCES public.agenda_items(id) ON DELETE SET NULL, -- For session chats
  created_by_attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
  created_by_speaker_id UUID REFERENCES public.speakers(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**conversation_participants** - Who is in each conversation
```sql
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.attendee_conversations(id) ON DELETE CASCADE,
  attendee_id UUID REFERENCES public.attendees(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES public.speakers(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  muted_until TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, attendee_id),
  UNIQUE(conversation_id, speaker_id),
  CHECK (
    (attendee_id IS NOT NULL AND speaker_id IS NULL) OR
    (attendee_id IS NULL AND speaker_id IS NOT NULL)
  )
);
```

**attendee_messages** - Individual messages
```sql
CREATE TABLE public.attendee_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.attendee_conversations(id) ON DELETE CASCADE,
  sender_attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
  sender_speaker_id UUID REFERENCES public.speakers(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.attendee_messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (sender_attendee_id IS NOT NULL AND sender_speaker_id IS NULL) OR
    (sender_attendee_id IS NULL AND sender_speaker_id IS NOT NULL)
  )
);
```

### RLS Policies

Security is critical - attendees can only:
- See conversations they're participants of
- Message in conversations they've joined
- See profiles of people who have opted-in OR are in shared conversations

---

## UI Components

### Bottom Navigation Update

Add a new "Messages" tab to the bottom navigation:

| Icon | Label | Route |
|------|-------|-------|
| MessageCircle | Messages | `/attendee/app/messages` |

### New Pages

| Page | Route | Purpose |
|------|-------|---------|
| Messages Hub | `/attendee/app/messages` | List all conversations (DMs + Groups) |
| Conversation | `/attendee/app/messages/:conversationId` | Chat view with message list and input |
| New Message | `/attendee/app/messages/new` | Start new DM or group |
| Attendee Directory | `/attendee/app/networking` | Browse attendees open to networking |
| My Profile | `/attendee/app/profile` | Edit networking profile |

### Messages Hub Layout

```text
┌─────────────────────────────────────────┐
│  Messages                    [+] [👤]   │
├─────────────────────────────────────────┤
│  [Search conversations...]              │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🟢 First Gen 2026 General Chat      │ │  ← Event-wide group
│ │    Welcome everyone! Looking forward│ │
│ │    12:34 PM               ●●● unread│ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 📌 Workshop: Resume Building        │ │  ← Session group
│ │    Great tips! Thanks Dr. Chen      │ │
│ │    11:20 AM                         │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ [Avatar] Sarah Johnson              │ │  ← Direct message
│ │    Would love to connect!           │ │
│ │    Yesterday               ●●● unread│ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 👥 Miami Networking Circle          │ │  ← Custom group
│ │    Anyone going to dinner tonight?  │ │
│ │    2h ago                           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Conversation View Layout

```text
┌─────────────────────────────────────────┐
│  ← Sarah Johnson                 [···]  │
├─────────────────────────────────────────┤
│                                         │
│         ┌───────────────────┐          │
│         │  Hi! I saw you're │          │
│         │  also from Texas. │          │
│         │  2:30 PM          │          │
│         └───────────────────┘          │
│                                         │
│  ┌───────────────────┐                 │
│  │ Yes! Hook 'em! 🤘  │                 │
│  │ 2:31 PM       ✓✓  │                 │
│  └───────────────────┘                 │
│                                         │
│         ┌───────────────────┐          │
│         │  Would you like   │          │
│         │  to grab coffee?  │          │
│         │  2:32 PM          │          │
│         └───────────────────┘          │
│                                         │
├─────────────────────────────────────────┤
│  [Type a message...]            [Send]  │
└─────────────────────────────────────────┘
```

### Networking Directory Layout

```text
┌─────────────────────────────────────────┐
│  ← Networking                   [🔍]    │
├─────────────────────────────────────────┤
│  [Search by name, company, title...]    │
├─────────────────────────────────────────┤
│                                         │
│  SPEAKERS                               │
│  ┌─────────────────────────────────────┐│
│  │ [Photo] Dr. Sarah Chen              ││
│  │         CEO, TechStart              ││
│  │         [Message]                   ││
│  └─────────────────────────────────────┘│
│                                         │
│  OPEN TO NETWORKING (12)                │
│  ┌─────────────────────────────────────┐│
│  │ [Avatar] Marcus Williams            ││
│  │          Engineer, Google           ││
│  │          Looking for mentors        ││
│  │          [Message]                  ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ [Avatar] Lisa Thompson              ││
│  │          Student, UT Austin         ││
│  │          Career advice welcome!     ││
│  │          [Message]                  ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

---

## Features Breakdown

### 1. Direct Messages (DMs)

- Start from networking directory or attendee profile
- One-on-one conversations between two people
- Speakers automatically discoverable (no opt-in needed)
- Attendees need "Open to Networking" enabled to be found
- Can still DM someone you meet in a group chat

### 2. Event-Wide Group Chat

- Auto-created for each event
- All attendees auto-joined when they first access messaging
- Good for announcements, general Q&A
- Moderated by event organizers

### 3. Session-Based Groups

- Auto-created for each agenda session
- Attendees who bookmarked a session get a prompt to join
- Persists after the session for follow-up discussion
- Great for workshop discussions, speaker Q&A

### 4. Custom Groups

- Any attendee can create a group
- Invite others from networking directory or DM contacts
- Set group name, description
- Roles: Owner (creator), Admin (can add people), Member

### 5. Profile & Privacy

- Edit display name, avatar, bio, company, title
- Toggle "Open to Networking" (off by default)
- When off: Not visible in directory, can't receive new DMs
- Can still participate in groups and respond to existing DMs

---

## Real-time Implementation

Enable Supabase Realtime for instant message delivery:

```sql
ALTER PUBLICATION supabase_realtime 
  ADD TABLE public.attendee_messages,
  ADD TABLE public.conversation_participants;
```

React hook pattern:
```typescript
// Subscribe to new messages in a conversation
const channel = supabase
  .channel(`messages-${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'attendee_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Add new message to list
  })
  .subscribe();
```

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `create-dm-conversation` | Start a new DM (validates both parties) |
| `create-group-conversation` | Create custom group with participants |
| `send-attendee-message` | Send message (validates membership) |
| `join-session-chat` | Join a session-based group |
| `update-attendee-profile` | Update networking profile |
| `get-networkable-attendees` | Fetch attendees open to networking |

---

## Files to Create

| File | Description |
|------|-------------|
| **Pages** | |
| `src/pages/attendee/Messages.tsx` | Messages hub with conversation list |
| `src/pages/attendee/Conversation.tsx` | Individual chat view |
| `src/pages/attendee/NewMessage.tsx` | Start new DM or group |
| `src/pages/attendee/Networking.tsx` | Attendee/speaker directory |
| `src/pages/attendee/AttendeeProfile.tsx` | Edit own networking profile |
| **Components** | |
| `src/components/attendee/ConversationCard.tsx` | Conversation list item |
| `src/components/attendee/MessageBubble.tsx` | Individual message |
| `src/components/attendee/MessageInput.tsx` | Compose message input |
| `src/components/attendee/NetworkingCard.tsx` | Attendee card in directory |
| `src/components/attendee/CreateGroupDialog.tsx` | Create custom group |
| `src/components/attendee/ProfileEditForm.tsx` | Edit networking profile |
| **Hooks** | |
| `src/hooks/useAttendeeMessages.ts` | Fetch/send messages with realtime |
| `src/hooks/useConversations.ts` | List conversations |
| `src/hooks/useNetworking.ts` | Directory queries |
| `src/hooks/useAttendeeProfile.ts` | Profile management |
| **Edge Functions** | |
| `supabase/functions/create-dm-conversation/index.ts` | Start DM |
| `supabase/functions/create-group-conversation/index.ts` | Create group |
| `supabase/functions/send-attendee-message/index.ts` | Send message |
| `supabase/functions/join-session-chat/index.ts` | Join session group |
| `supabase/functions/update-attendee-profile/index.ts` | Update profile |
| `supabase/functions/get-networkable-attendees/index.ts` | Directory API |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/attendee/BottomNavigation.tsx` | Add Messages tab |
| `src/contexts/AttendeeContext.tsx` | Add unread message count |
| `src/pages/attendee/Dashboard.tsx` | Add routes for new pages |
| `src/App.tsx` | Register new attendee routes |

---

## Implementation Phases

### Phase 1: Foundation
- Database tables and RLS policies
- Attendee profile with opt-in
- Edge function for profile updates

### Phase 2: Direct Messaging
- DM conversation creation
- Message sending/receiving
- Real-time subscriptions
- Conversation list UI

### Phase 3: Networking Directory
- Directory page with search
- Speaker listing (always visible)
- Attendee listing (opt-in only)
- Start DM from directory

### Phase 4: Group Chats
- Event-wide group (auto-join)
- Session-based groups
- Custom group creation
- Group management (add/remove members)

### Phase 5: Polish
- Unread badges in navigation
- Message search
- Reply threading
- Message reactions (optional)

---

## Security Considerations

1. **Privacy First**: Attendees hidden by default unless they opt-in
2. **Event Scoped**: Can only message people from same event
3. **Validated Membership**: Edge functions verify conversation membership before sending
4. **Session Authentication**: Uses existing email OTP session tokens
5. **RLS Everywhere**: Database-level enforcement of access rules

