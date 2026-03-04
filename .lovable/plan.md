

# Make URLs Clickable in Society Feed Posts

## Changes

### 1. `src/components/feed/PostCard.tsx` (line 133)
Replace `{post.content}` with `<LinkifiedText text={post.content} />` so URLs in Society feed posts are clickable. Import `LinkifiedText` from `@/utils/linkifyText`.

### 2. `src/components/attendee/feed/cards/PostCard.tsx` (line 276)
Replace `{post.caption}` with `<LinkifiedText text={post.caption} linkClassName="text-white underline break-all" />` so URLs in the attendee conference feed post captions are clickable. Uses white link styling to match the light-on-dark overlay text. Import `LinkifiedText` from `@/utils/linkifyText`.

### 3. `src/components/feed/CommentsSection.tsx` (line 117)
Replace `{comment.content}` with `<LinkifiedText text={comment.content} />` so URLs posted in comments are also clickable. Import `LinkifiedText` from `@/utils/linkifyText`.

All three use the existing `LinkifiedText` utility — no new files needed.

