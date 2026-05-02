import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import type { AlbumPhoto, AlbumFilter } from '@/types/album';

const PAGE_SIZE = 24;
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_CAPTION_LENGTH = 500;
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;
const ALLOWED_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

// Allowed extensions in storage paths (HEIC/HEIF are converted to jpg before upload).
const ALLOWED_PATH_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Pattern: {uploader-uuid}/{file-uuid}.{ext}
const ALBUM_STORAGE_PATH_RE = new RegExp(
  `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/` +
    `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}` +
    `\\.(${ALLOWED_PATH_EXTS.join('|')})$`,
  'i',
);

export function validateAlbumFile(file: File): string | null {
  if (file.size === 0) return 'File is empty';
  if (file.size > MAX_FILE_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `File is too large (${mb}MB). Max allowed is 25MB.`;
  }
  const typeOk = (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type);
  const extOk = ALLOWED_EXT_RE.test(file.name);
  if (!typeOk && !extOk) {
    return 'Unsupported file type. Use JPG, PNG, WebP, GIF, or HEIC.';
  }
  return null;
}

export function validateAlbumCaption(caption: string): string | null {
  if (caption.length > MAX_CAPTION_LENGTH) {
    return `Caption is too long (${caption.length}/${MAX_CAPTION_LENGTH} characters).`;
  }
  return null;
}

/**
 * Validates that a storage path matches the exact required pattern for the
 * `album-photos` bucket: `{uploaderUserId}/{uuid}.{allowedExt}`.
 *
 * Mirrors the server-side `validate_album_photo_path` trigger and the
 * `album_photos_storage_path_ext` CHECK constraint, so violations are caught
 * before round-tripping to Supabase.
 */
export function validateAlbumStoragePath(path: string, uploaderUserId: string): string | null {
  if (!path || typeof path !== 'string') return 'Storage path is required.';
  if (path.length > 512) return 'Storage path is too long.';
  if (path !== path.trim()) return 'Storage path has leading or trailing whitespace.';
  if (path.startsWith('/')) return 'Storage path must not start with a slash.';
  if (path.includes('//')) return 'Storage path must not contain empty segments.';
  if (path.includes('..') || path.includes('\\')) return 'Storage path contains invalid characters.';
  if (/\s/.test(path)) return 'Storage path must not contain whitespace.';

  const segments = path.split('/');
  if (segments.length !== 2) {
    return 'Storage path must be in the form {userId}/{uuid}.{ext}.';
  }

  const [folder, filename] = segments;

  if (!UUID_RE.test(uploaderUserId)) {
    return 'Uploader id is invalid.';
  }
  if (folder.toLowerCase() !== uploaderUserId.toLowerCase()) {
    return 'Storage path must start with your own user folder.';
  }

  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === filename.length - 1) {
    return 'File name must include a valid extension.';
  }
  const base = filename.slice(0, dotIndex);
  const ext = filename.slice(dotIndex + 1).toLowerCase();

  if (!UUID_RE.test(base)) {
    return 'File name must be a UUID.';
  }
  if (!(ALLOWED_PATH_EXTS as readonly string[]).includes(ext)) {
    return 'Unsupported file extension. Use JPG, PNG, WebP, GIF, or HEIC.';
  }

  // Final belt-and-suspenders regex check.
  if (!ALBUM_STORAGE_PATH_RE.test(path)) {
    return 'Storage path does not match the required format.';
  }

  return null;
}

/**
 * Builds a guaranteed-valid `album-photos` storage path for the given uploader
 * and file. Throws if the resulting path would fail validation.
 */
export function buildAlbumStoragePath(uploaderUserId: string, file: File): string {
  const nameExt = (file.name.split('.').pop() || '').toLowerCase();
  const safeExt = (ALLOWED_PATH_EXTS as readonly string[]).includes(nameExt) ? nameExt : 'jpg';
  const path = `${uploaderUserId}/${crypto.randomUUID()}.${safeExt}`;
  const err = validateAlbumStoragePath(path, uploaderUserId);
  if (err) throw new Error(err);
  return path;
}

function friendlyUploadError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const msg = raw.toLowerCase();

  // Named CHECK constraints on public.album_photos
  if (msg.includes('album_photos_caption_length')) {
    return `Caption is too long (max ${MAX_CAPTION_LENGTH} characters).`;
  }
  if (msg.includes('album_photos_file_size_max')) {
    return 'File is too large (max 25MB).';
  }
  if (msg.includes('album_photos_file_size_positive')) {
    return 'File appears to be empty. Please choose another photo.';
  }
  if (msg.includes('album_photos_storage_path_ext')) {
    return 'Unsupported file type. Use JPG, PNG, WebP, GIF, or HEIC.';
  }
  if (msg.includes('album_photos_storage_path_format') || msg.includes('album_photos_storage_path_not_empty')) {
    return 'Upload rejected: invalid storage path.';
  }
  if (msg.includes('album_photos_width_positive') || msg.includes('album_photos_height_positive') || msg.includes('album_photos_dimensions')) {
    return 'Image dimensions are invalid. Please try a different photo.';
  }

  // Validation trigger: storage path must live under uploader's user folder
  if (msg.includes('storage_path must start with uploader')) {
    return 'Upload rejected: photo must be stored in your own folder.';
  }
  if (msg.includes('storage_path and uploaded_by are required')) {
    return 'Upload rejected: missing photo metadata.';
  }

  // NOT NULL violations on album_photos columns
  if (msg.includes('null value') && msg.includes('album_photos')) {
    if (msg.includes('"storage_path"')) return 'Upload failed: missing storage path.';
    if (msg.includes('"uploaded_by"')) return 'Upload failed: missing uploader. Please sign in again.';
    return 'Upload failed: required information is missing.';
  }

  // Foreign key / unique constraints (defensive — none expected on insert today)
  if (msg.includes('duplicate key') && msg.includes('album_photos')) {
    return 'This photo has already been uploaded.';
  }
  if (msg.includes('violates foreign key') && msg.includes('album_photos')) {
    return 'Upload rejected: linked record no longer exists.';
  }

  // RLS / auth
  if (msg.includes('row-level security') || msg.includes('row level security') || msg.includes('permission denied')) {
    return 'You do not have permission to upload to the album.';
  }
  if (msg.includes('jwt') || msg.includes('not authenticated')) {
    return 'Your session expired. Please sign in and try again.';
  }

  // Storage layer
  if (msg.includes('payload too large') || msg.includes('413')) {
    return 'File is too large to upload (max 25MB).';
  }
  if (msg.includes('mime') || msg.includes('invalid_mime_type')) {
    return 'Unsupported file type. Use JPG, PNG, WebP, GIF, or HEIC.';
  }
  if (msg.includes('the resource already exists') || msg.includes('duplicate') && msg.includes('storage')) {
    return 'A file with that name already exists. Please try again.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('timeout')) {
    return 'Network error. Check your connection and try again.';
  }

  return raw || 'Upload failed. Please try again.';
}

async function convertHeicIfNeeded(file: File): Promise<File> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name);
  if (!isHeic) return file;
  const heic2any = (await import('heic2any')).default;
  const blob = (await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })) as Blob;
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], newName, { type: 'image/jpeg' });
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

interface RawPhotoRow {
  id: string;
  uploaded_by: string;
  storage_path: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  created_at: string;
}

const SIGNED_URL_TTL = 60 * 60; // 1 hour

async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data, error } = await supabase.storage
    .from('album-photos')
    .createSignedUrls(paths, SIGNED_URL_TTL);
  if (error) {
    console.error('Failed to sign album photo URLs', error);
    return map;
  }
  (data ?? []).forEach((row) => {
    if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  });
  return map;
}

async function hydratePhotos(rows: RawPhotoRow[], currentUserId: string | undefined): Promise<AlbumPhoto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const userIds = Array.from(new Set(rows.map((r) => r.uploaded_by)));
  const paths = Array.from(new Set(rows.map((r) => r.storage_path)));

  const [{ data: profiles }, { data: likes }, { data: comments }, signedMap] = await Promise.all([
    supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
    supabase.from('album_photo_likes').select('photo_id, user_id').in('photo_id', ids),
    supabase.from('album_photo_comments').select('photo_id').in('photo_id', ids),
    signPaths(paths),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const likeCounts = new Map<string, number>();
  const userLiked = new Set<string>();
  (likes ?? []).forEach((l) => {
    likeCounts.set(l.photo_id, (likeCounts.get(l.photo_id) ?? 0) + 1);
    if (currentUserId && l.user_id === currentUserId) userLiked.add(l.photo_id);
  });
  const commentCounts = new Map<string, number>();
  (comments ?? []).forEach((c) => {
    commentCounts.set(c.photo_id, (commentCounts.get(c.photo_id) ?? 0) + 1);
  });

  return rows.map((r) => {
    const p = profileMap.get(r.uploaded_by);
    return {
      ...r,
      image_url: signedMap.get(r.storage_path) ?? '',
      uploader: {
        full_name: p?.full_name ?? 'Member',
        avatar_url: p?.avatar_url ?? null,
      },
      likes_count: likeCounts.get(r.id) ?? 0,
      comments_count: commentCounts.get(r.id) ?? 0,
      user_has_liked: userLiked.has(r.id),
    };
  });
}

export function useAlbumPhotos(filter: AlbumFilter = 'all') {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['album-photos', filter, user?.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('album_photos_safe' as 'album_photos')
        .select('id, uploaded_by, storage_path, caption, width, height, file_size, created_at')
        .order('created_at', { ascending: false })
        .range(pageParam as number, (pageParam as number) + PAGE_SIZE - 1);

      if (filter === 'mine' && user) {
        query = query.eq('uploaded_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const hydrated = await hydratePhotos((data ?? []) as RawPhotoRow[], user?.id);

      if (filter === 'top') {
        hydrated.sort((a, b) => b.likes_count - a.likes_count);
      }

      return {
        photos: hydrated,
        nextOffset: (data?.length ?? 0) === PAGE_SIZE ? (pageParam as number) + PAGE_SIZE : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 30_000,
  });
}

export function useAlbumPhoto(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['album-photo', id, user?.id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_photos_safe' as 'album_photos')
        .select('id, uploaded_by, storage_path, caption, width, height, file_size, created_at')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [hydrated] = await hydratePhotos([data as RawPhotoRow], user?.id);
      return hydrated;
    },
  });
}

export interface PendingUpload {
  id: string;
  file: File;
  caption: string;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
}

export function useUploadAlbumPhotos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uploads,
      onProgress,
    }: {
      uploads: PendingUpload[];
      onProgress: (id: string, update: Partial<PendingUpload>) => void;
    }) => {
      if (!user) throw new Error('Not authenticated');

      let succeeded = 0;
      for (const item of uploads) {
        try {
          onProgress(item.id, { status: 'uploading', progress: 5 });

          let file = item.file;

          // Server-aligned validation
          const fileError = validateAlbumFile(file);
          if (fileError) throw new Error(fileError);
          const captionError = validateAlbumCaption(item.caption);
          if (captionError) throw new Error(captionError);

          file = await convertHeicIfNeeded(file);
          onProgress(item.id, { progress: 25 });

          // Compress large files
          if (file.size > 5 * 1024 * 1024) {
            file = await imageCompression(file, {
              maxSizeMB: 4,
              maxWidthOrHeight: 2560,
              useWebWorker: true,
              fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            });
          }
          onProgress(item.id, { progress: 55 });

          const dims = await getImageDimensions(file);

          const path = buildAlbumStoragePath(user.id, file);
          const pathError = validateAlbumStoragePath(path, user.id);
          if (pathError) throw new Error(pathError);

          const { error: uploadError } = await supabase.storage
            .from('album-photos')
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          onProgress(item.id, { progress: 85 });

          const { error: insertError } = await supabase.from('album_photos').insert({
            uploaded_by: user.id,
            // image_url is no longer stored — bucket is private and URLs are signed on demand.
            image_url: null as unknown as string,
            storage_path: path,
            caption: item.caption.trim() || null,
            width: dims.width || null,
            height: dims.height || null,
            file_size: file.size,
          });
          if (insertError) {
            // Best-effort cleanup of orphaned storage object
            await supabase.storage.from('album-photos').remove([path]);
            throw insertError;
          }

          onProgress(item.id, { status: 'done', progress: 100 });
          succeeded++;
        } catch (err) {
          const message = friendlyUploadError(err);
          console.error('Album upload failed', err);
          onProgress(item.id, { status: 'error', error: message });
        }
      }

      return { succeeded, total: uploads.length };
    },
    onSuccess: ({ succeeded, total }) => {
      queryClient.invalidateQueries({ queryKey: ['album-photos'] });
      if (succeeded > 0) {
        toast.success(
          succeeded === total
            ? `Uploaded ${succeeded} photo${succeeded === 1 ? '' : 's'}`
            : `Uploaded ${succeeded} of ${total} photos`,
        );
      } else if (total > 0) {
        toast.error('No photos were uploaded. Check the errors above and try again.');
      }
    },
  });
}

export function useDeleteAlbumPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photo: AlbumPhoto) => {
      // Delete the DB row first — RLS enforces ownership/admin and the
      // cascade trigger removes child likes/comments. Storage cleanup is
      // best-effort afterwards (orphan-cleanup edge function catches strays).
      const { error } = await supabase.from('album_photos').delete().eq('id', photo.id);
      if (error) throw error;
      await supabase.storage.from('album-photos').remove([photo.storage_path]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album-photos'] });
      queryClient.invalidateQueries({ queryKey: ['album-photo'] });
      toast.success('Photo deleted');
    },
    onError: (err) => {
      console.error('Album photo delete failed', err);
      toast.error('Could not delete photo');
    },
  });
}

export function useBulkDeleteAlbumPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photos: AlbumPhoto[]) => {
      if (photos.length === 0) return { deleted: 0, failed: 0 };
      const ids = photos.map((p) => p.id);
      const paths = Array.from(
        new Set(photos.map((p) => p.storage_path).filter((p): p is string => !!p)),
      );

      const { data: deletedRows, error } = await supabase
        .from('album_photos')
        .delete()
        .in('id', ids)
        .select('id');
      if (error) throw error;

      const deleted = deletedRows?.length ?? 0;
      const failed = ids.length - deleted;

      // Best-effort storage cleanup; orphan-cleanup edge fn handles stragglers.
      if (paths.length > 0) {
        await supabase.storage.from('album-photos').remove(paths);
      }

      return { deleted, failed };
    },
    onSuccess: ({ deleted, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['album-photos'] });
      if (deleted > 0) {
        toast.success(
          failed > 0
            ? `Deleted ${deleted} photo${deleted === 1 ? '' : 's'} (${failed} could not be removed)`
            : `Deleted ${deleted} photo${deleted === 1 ? '' : 's'}`,
        );
      } else {
        toast.error('No photos were deleted.');
      }
    },
    onError: (err) => {
      console.error('Album bulk delete failed', err);
      toast.error('Could not delete selected photos');
    },
  });
}
