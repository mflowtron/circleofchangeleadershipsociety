
# User Profile Navigation Implementation

## Overview
Add the ability to click on any user's name or avatar throughout the app to navigate to their profile page. This requires creating a public profile view for other users and making avatars/names clickable across all components.

## Implementation Steps

### 1. Create a Reusable Clickable User Avatar Component
Create a new `ClickableUserAvatar` component that wraps the existing Avatar with Link navigation:

**File**: `src/components/ui/clickable-user-avatar.tsx`
- Props: `userId`, `fullName`, `avatarUrl`, `size` (optional)
- Wraps Avatar in a Link to `/profile/:userId`
- Adds hover effects to indicate clickability
- If `userId` matches current user, links to `/profile` (own profile)

### 2. Create Public User Profile Page
Create a new page to view other users' profiles:

**File**: `src/pages/UserProfile.tsx`
- Route: `/profile/:userId`
- Fetches profile data for the given `userId` from the `profiles` table
- Displays: avatar, full name, LinkedIn link (if available), chapter name
- Read-only view (no edit functionality for other users' profiles)
- If user views their own profile via this route, redirect to `/profile`

### 3. Update Routing
Modify `src/App.tsx` to add the new route:
- Add `/profile/:userId` route pointing to `UserProfile` component
- Place it before the existing `/profile` route

### 4. Update PostCard Component
Modify `src/components/feed/PostCard.tsx`:
- Wrap the author avatar and name in a clickable Link to `/profile/:userId`
- Pass `post.user_id` for navigation
- Add hover cursor and underline effect on name

### 5. Update CommentsSection Component
Modify `src/components/feed/CommentsSection.tsx`:
- Make comment author avatar and name clickable
- Link to `/profile/:commentUserId`
- Note: The current user's avatar (for posting comments) should link to their own profile

### 6. Update Moderation Page
Modify `src/pages/Moderation.tsx`:
- Make post author avatars and names clickable
- Link to the respective user's profile

### 7. Update MyChapter Page
Modify `src/pages/MyChapter.tsx`:
- Make post author avatars/names clickable in the Recent Posts section
- Make member avatars/names clickable in the Members list

### 8. Update Header Component
Modify `src/components/layout/Header.tsx`:
- Current user's avatar already links to profile via dropdown menu (no change needed)

---

## Technical Details

### Database Access
No database changes required. The existing `profiles` table contains all needed fields:
- `user_id` (for routing)
- `full_name`
- `avatar_url`
- `linkedin_url`
- `chapter_id` (join with `chapters` table for chapter name)

### RLS Policies
Profiles should already be readable by authenticated users. If not, an RLS policy may need to be added for SELECT access.

### Files to Create
1. `src/components/ui/clickable-user-avatar.tsx` - Reusable clickable avatar component
2. `src/pages/UserProfile.tsx` - Public user profile page

### Files to Modify
1. `src/App.tsx` - Add new route
2. `src/components/feed/PostCard.tsx` - Make author clickable
3. `src/components/feed/CommentsSection.tsx` - Make comment authors clickable
4. `src/pages/Moderation.tsx` - Make post authors clickable
5. `src/pages/MyChapter.tsx` - Make authors and members clickable

### ClickableUserAvatar Component API
```typescript
interface ClickableUserAvatarProps {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}
```

### Navigation Logic
- Clicking avatar/name navigates to `/profile/{userId}`
- The UserProfile page checks if `userId` matches current user and redirects to `/profile` if so
- This ensures the "My Profile" edit functionality is only available on the user's own profile page
