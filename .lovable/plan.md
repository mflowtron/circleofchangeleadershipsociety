

## Overview

This change will improve user engagement with comments by:
1. Automatically showing comments when they exist
2. Making the "no comments" state more inviting when comments are absent

## Implementation Details

### 1. Auto-expand comments when present

**File: `src/components/feed/PostCard.tsx`**

Change the initial state of `showComments` to be based on whether the post has comments:

```typescript
// Before
const [showComments, setShowComments] = useState(false);

// After
const [showComments, setShowComments] = useState(post.comments_count > 0);
```

This ensures that posts with existing comments will have their comments section expanded by default.

### 2. Enhance the "no comments" encouragement

**File: `src/components/feed/CommentsSection.tsx`**

Update the empty state to be more visually engaging and action-oriented:

- Add a MessageCircle icon to draw attention
- Make the text more inviting with a friendly message
- Keep the input field prominently visible (already there)

The updated empty state will feature:
- A subtle icon
- Encouraging text like "Be the first to comment!"
- The comment input remains visible and ready for input

## Technical Approach

| Change | File | Lines Affected |
|--------|------|----------------|
| Initialize `showComments` based on `comments_count` | `PostCard.tsx` | Line 41 |
| Enhanced empty state UI | `CommentsSection.tsx` | Lines 66-69 |

## User Experience Flow

- **Post with comments**: Comments section is visible immediately, showing existing conversation
- **Post without comments**: Comments section stays collapsed, but clicking the comment button reveals an inviting prompt to start the conversation

## Alternative Consideration

The comments section will remain collapsed for posts without comments (since there's nothing to show by default). This keeps the feed clean while still making it easy to add a comment by clicking the button.

