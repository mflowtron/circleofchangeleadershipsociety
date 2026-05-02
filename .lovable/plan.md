# Fix delete button + add admin bulk delete

## 1. Fix single-photo delete (`AlbumLightbox.tsx`)

Current `handleDelete` has no error handling and races navigation against the cache invalidation.

- Wrap `mutateAsync` in `try/catch`; only navigate on success.
- Compute next-index/close decision *before* awaiting.
- Disable the delete trigger and AlertDialogAction while `deletePhoto.isPending`; show a spinner in the action.
- Reorder mutation in `useDeleteAlbumPhoto` to delete the DB row first (RLS-checked, cascade trigger handles likes/comments), then best-effort storage cleanup. The orphan-cleanup edge function catches any strays.

## 2. Add bulk-delete mutation (`useAlbumPhotos.ts`)

New `useBulkDeleteAlbumPhotos()`:
- Accepts `AlbumPhoto[]`.
- Single `delete().in('id', ids).select('id')` — count of returned rows tells us how many RLS actually removed.
- Single `storage.remove(paths)` afterwards (best-effort).
- Toasts deleted/failed counts; invalidates `['album-photos']`.

## 3. Admin selection mode in gallery (`Album.tsx` + `AlbumTile.tsx`)

Admin-only (`isAdmin` from `useAuth`):

- "Select" button beside filter pills toggles selection mode.
- In selection mode, tiles render a circular checkbox overlay (top-right) with a primary ring when selected; clicking toggles selection instead of opening the lightbox.
- Sticky bottom action bar: `"N selected"` · Cancel · Delete (destructive). Uses safe-area padding.
- Delete opens an `AlertDialog`: `"Delete N photos? This will permanently remove the photos and all their comments and likes."`
- Selection clears when filter changes or mode is exited.

## Technical notes

- RLS already permits admins to delete any row/object (verified policies).
- Cascade trigger `cascade_delete_album_photo_children` removes likes/comments.
- No DB migrations required.

## Files
- `src/hooks/useAlbumPhotos.ts` — harden `useDeleteAlbumPhoto`, add `useBulkDeleteAlbumPhotos`.
- `src/components/album/AlbumLightbox.tsx` — robust delete handler + pending state.
- `src/components/album/AlbumTile.tsx` — selection-mode props + checkbox overlay.
- `src/pages/Album.tsx` — selection toggle, action bar, confirm dialog.
