

# Add Comments/Replies Feature to Conference Feed

## Overview
Add functionality for attendees to tap the comment button on feed posts to view and add comments. The feature will use a bottom sheet overlay that slides up from the bottom, providing a mobile-native experience matching the TikTok-style feed.

---

## Database Design

### New Table: `feed_post_comments`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| feed_post_id | text | No | - | ID matching post in feed (e.g., "1", "3") |
| event_id | uuid | No | - | Event context for the feed |
| attendee_id | uuid | No | - | Comment author (references attendees) |
| content | text | No | - | Comment text |
| created_at | timestamptz | No | now() | Creation timestamp |

**RLS Policies:**
- SELECT: Attendees can view comments for posts in events they're registered for
- INSERT: Attendees can add comments (authenticated via attendee_id verification)
- DELETE: Attendees can delete their own comments

---

## Implementation Approach

### 1. Database Migration
Create the `feed_post_comments` table with proper indexes and RLS policies.

### 2. Edge Function: `manage-feed-comments`
Handles:
- Fetching comments for a post (GET)
- Adding a new comment (POST)
- Deleting a comment (DELETE)

Authentication is via JWT verification to identify the attendee.

### 3. New Hook: `useFeedComments`
```typescript
interface FeedComment {
  id: string;
  content: string;
  created_at: string;
  attendee: {
    id: string;
    name: string;
    avatar_initials: string;
    avatar_bg: string;
  };
}

function useFeedComments(postId: string, eventId: string) {
  return {
    comments: FeedComment[],
    loading: boolean,
    addComment: (content: string) => Promise<void>,
    deleteComment: (commentId: string) => Promise<void>,
    refetch: () => void
  }
}
```

### 4. New Component: `FeedCommentsSheet`
A bottom sheet component that:
- Slides up from the bottom (60% height)
- Shows a draggable handle for closing
- Displays comments in a scrollable list
- Has a pinned input at the bottom for adding comments
- Shows loading skeleton while fetching
- Shows empty state when no comments

```text
┌────────────────────────────────────┐
│         ── (drag handle)           │
│                                    │
│  32 Comments                       │
│                                    │
│  ┌─────────────────────────────┐  │
│  │ DM  Destiny Morgan   2h ago │  │
│  │     This is amazing! 🔥      │  │
│  └─────────────────────────────┘  │
│                                    │
│  ┌─────────────────────────────┐  │
│  │ MT  Marcus Thompson  1h ago │  │
│  │     Love this vibe!          │  │
│  └─────────────────────────────┘  │
│                                    │
│  [... more comments scroll ...]    │
│                                    │
├────────────────────────────────────┤
│  [Avatar] [Input............] [➤] │
│           ↑ Safe area padding      │
└────────────────────────────────────┘
```

### 5. Update PostCard
- Add `onOpenComments` prop
- Wire the comment button to trigger the sheet
- Update `ConferenceFeed` to manage comments sheet state

---

## Component Architecture

```text
ConferenceFeed
├── FeedCommentsSheet (portal overlay)
│   ├── Header (count + close handle)
│   ├── Comments List (scrollable)
│   └── Comment Input (fixed bottom)
└── PostCard
    └── Comment Button (triggers sheet)
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/manage-feed-comments/index.ts` | Edge function for CRUD operations |
| `src/hooks/useFeedComments.ts` | Data fetching hook |
| `src/components/attendee/feed/FeedCommentsSheet.tsx` | Bottom sheet UI |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/attendee/feed/cards/PostCard.tsx` | Add `onOpenComments` prop, wire button |
| `src/components/attendee/feed/ConferenceFeed.tsx` | Add comments sheet state, pass handlers |
| `src/types/conferenceFeed.ts` | Add FeedAction for comment count updates |
| Database | Migration for `feed_post_comments` table |

---

## UI/UX Details

### Sheet Behavior
- Opens with slide-up animation (300ms ease-out)
- 60% of screen height (max 70vh)
- Dark translucent overlay backdrop
- Draggable handle at top for swipe-to-close
- Tap outside to close

### Comment Display
- Attendee avatar (initials with color)
- Name + timestamp
- Comment content
- Delete button (only for own comments)

### Input Area
- Avatar of current attendee
- Text input with placeholder "Add a comment..."
- Send button (disabled when empty)
- Respects safe area inset at bottom

### Dark Theme Styling
- Background: `bg-[#1a1a1b]` or similar dark color
- Text: white/gray hierarchy
- Input: dark background with light border
- Consistent with the immersive feed aesthetic

---

## Security Considerations

1. **Authentication**: Edge function verifies JWT and matches attendee to event
2. **Authorization**: Attendees can only comment on events they're registered for
3. **Content Validation**: Max 500 characters, trimmed whitespace
4. **Rate Limiting**: Consider future rate limiting for spam prevention
5. **RLS Policies**: Enforce row-level security on database

---

## Implementation Order

1. Create database migration with `feed_post_comments` table
2. Create edge function `manage-feed-comments`
3. Create `useFeedComments` hook
4. Create `FeedCommentsSheet` component
5. Update `PostCard` with `onOpenComments` prop
6. Update `ConferenceFeed` to manage sheet state and pass handlers
7. Test the complete flow

