
# Add "Posts by this User" to Profile Page

## Overview
Display a list of posts created by the user on their public profile page, allowing visitors to see that user's activity in the community.

## Implementation Steps

### 1. Create a New Hook for User Posts
Create a new hook `useUserPosts` that fetches posts for a specific user ID.

**File**: `src/hooks/useUserPosts.ts`
- Accept a `userId` parameter
- Fetch posts where `user_id` matches the provided ID
- Reuse the same enrichment logic from `usePosts` (likes count, comments count, user's like status)
- Return posts with the same `Post` type for compatibility with `PostCard`

### 2. Update UserProfile Page
Modify `src/pages/UserProfile.tsx` to display the user's posts.

**Changes**:
- Import the new `useUserPosts` hook
- Import the `PostCard` component
- Add a "Posts by [Name]" section below the profile card
- Show loading skeleton while posts are loading
- Display message if user has no posts
- Enable like/delete functionality (delete only for admins or the post owner)

---

## Technical Details

### New Hook API
```typescript
export function useUserPosts(userId: string | undefined) {
  // Returns: { posts, loading, toggleLike, deletePost, refetch }
}
```

### Files to Create
1. `src/hooks/useUserPosts.ts` - Hook for fetching a specific user's posts

### Files to Modify
1. `src/pages/UserProfile.tsx` - Add posts section to the profile page

### UI Layout
```text
+----------------------------------+
| <- Go Back                       |
+----------------------------------+
| [Avatar]                         |
| Full Name                        |
| Headline                         |
| Chapter                          |
| [LinkedIn Button]                |
+----------------------------------+
| Posts by Full Name               |
+----------------------------------+
| [PostCard 1]                     |
+----------------------------------+
| [PostCard 2]                     |
+----------------------------------+
| ... or "No posts yet"            |
+----------------------------------+
```

### Empty State
If the user has no posts, display a friendly message like "No posts yet" with a muted text style.
