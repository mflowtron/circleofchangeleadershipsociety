# Shared Album for Society

A members-only photo album in the Society (LMS) section. Anyone can upload, everyone can view, react, comment, and download. Uploaders + admins can delete.

## User Experience

### Gallery view (`/lms/album`)
- Premium masonry-style grid (CSS columns), responsive: 2 cols mobile / 3 tablet / 4–5 desktop
- Each tile: photo with subtle hover zoom + gold ring, small overlay showing uploader avatar, like count, comment count
- Sticky header with title "Shared Album", count of photos, and prominent gold "Upload Photos" button
- Filter chips: All / My Uploads / Most Liked
- Infinite scroll (paginated 24 at a time via React Query `useInfiniteQuery`)
- Empty state with elegant illustration + CTA

### Upload flow
- Modal with drag-and-drop zone supporting **multiple files**
- Per-file preview thumbnails with progress bars and remove buttons
- Optional caption per photo (single textarea applied to batch, or per-file)
- Accepts JPG, PNG, WebP, GIF, HEIC (HEIC auto-converted to JPEG client-side via `heic2any`); 25MB max per file
- Client-side image compression for files >5MB using `browser-image-compression` to keep gallery fast while preserving quality
- Toast on completion; gallery refreshes optimistically

### Detail / Lightbox view
- Full-screen overlay (React Portal, matches existing `ImageLightbox` aesthetic)
- Large image centered, dark backdrop with blur
- **Left/Right arrow keys** navigate prev/next; on-screen chevron buttons too
- `Esc` closes; swipe left/right on mobile
- Side panel (desktop) / bottom sheet (mobile) with:
  - Uploader avatar + name + relative time
  - Caption
  - Like (heart) button with count + reactor avatars
  - Comments thread with input
  - Download button (fetches blob, triggers download with original filename)
  - Delete (only for uploader or admin) with confirm
- Pinch-to-zoom + double-tap zoom on image (reuse patterns from existing lightbox)
- Deep-linkable: `/lms/album/:photoId` opens directly to that photo

## Technical Plan

### Database (migration)
New tables in `public`:

```sql
create table album_photos (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null,
  image_url text not null,
  storage_path text not null,
  caption text check (char_length(caption) <= 500),
  width int, height int,
  file_size int,
  created_at timestamptz not null default now()
);

create table album_photo_likes (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references album_photos(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (photo_id, user_id)
);

create table album_photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references album_photos(id) on delete cascade,
  user_id uuid not null,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);
```

Indexes on `created_at desc`, `photo_id`, `uploaded_by`.

### RLS policies
- `album_photos`:
  - SELECT: any authenticated user (`auth.uid() is not null`)
  - INSERT: authenticated, `uploaded_by = auth.uid()`
  - DELETE: `uploaded_by = auth.uid() OR is_admin(auth.uid())`
  - UPDATE: same as DELETE (for caption edits later)
- `album_photo_likes`:
  - SELECT: authenticated
  - INSERT/DELETE: `user_id = auth.uid()`
- `album_photo_comments`:
  - SELECT: authenticated
  - INSERT: `user_id = auth.uid()` with length check
  - DELETE: own comment or admin

### Storage
- New public bucket `album-photos` (public read for fast CDN delivery)
- Storage policies on `storage.objects` for `bucket_id = 'album-photos'`:
  - INSERT: authenticated, path begins with `auth.uid()::text || '/'`
  - DELETE: same path-owner rule OR `is_admin(auth.uid())`
  - SELECT: authenticated
- Path scheme: `{user_id}/{uuid}.{ext}`

### Frontend files
- `src/types/album.ts` — `AlbumPhoto`, `AlbumComment`, `AlbumPhotoWithStats`
- `src/hooks/useAlbumPhotos.ts` — `useInfiniteQuery` list, `useAlbumPhoto(id)`, `useUploadAlbumPhotos` (batch with progress), `useDeleteAlbumPhoto`
- `src/hooks/useAlbumLikes.ts` — toggle like with optimistic updates
- `src/hooks/useAlbumComments.ts` — list + add + delete
- `src/pages/Album.tsx` — gallery page
- `src/components/album/AlbumGrid.tsx` — masonry grid
- `src/components/album/AlbumTile.tsx` — single tile
- `src/components/album/AlbumUploadDialog.tsx` — batch upload UI
- `src/components/album/AlbumLightbox.tsx` — full-screen viewer with keyboard nav, zoom, swipe
- `src/components/album/AlbumCommentList.tsx`
- `src/components/album/AlbumLikeButton.tsx`
- Routing: add `/lms/album` and `/lms/album/:photoId` in `App.tsx`
- Sidebar: add "Album" entry (Lucide `Images` icon) for student/advisor/admin nav arrays in `src/components/layout/Sidebar.tsx`
- Dependencies: `heic2any`, `browser-image-compression`

### Keyboard navigation
In `AlbumLightbox`, attach a `useEffect` keydown listener:
- `ArrowRight` → next photo (wraps or stops at end)
- `ArrowLeft` → previous photo
- `Escape` → close
- `L` → toggle like (nice power-user touch)

Navigation updates URL via `navigate(`/lms/album/${nextId}`, { replace: true })` so back button works naturally.

### Performance
- Use `loading="lazy"` and `decoding="async"` on grid images
- Serve via Supabase public URL with width hint (`?width=600`) for thumbnails when supported, full-resolution in lightbox
- Prefetch neighbor images in lightbox (`new Image().src = nextUrl`)
- React Query: `staleTime: 30s` for list, invalidate on upload/delete

### Brand alignment
- Gold accents on hover/active, Playfair Display for page title, Inter for UI
- Burgundy-to-black gradient header strip on the Album page
- Skeleton loaders (not spinners) while grid loads

## Out of scope (v1)
- Albums/folders (single shared album for now)
- Tagging people in photos
- EXIF extraction beyond width/height
- Video uploads (photos only)

After approval I'll implement the migration, storage bucket + policies, hooks, components, route, and sidebar entry.