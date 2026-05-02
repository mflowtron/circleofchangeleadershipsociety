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

function friendlyUploadError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const msg = raw.toLowerCase();
  if (msg.includes('album_photos_caption_length')) return 'Caption is too long (max 500 characters).';
  if (msg.includes('album_photos_file_size_max')) return 'File is too large (max 25MB).';
  if (msg.includes('album_photos_storage_path_ext')) return 'Unsupported file type.';
  if (msg.includes('row-level security')) return 'You do not have permission to upload.';
  if (msg.includes('payload too large') || msg.includes('413')) return 'File is too large to upload.';
  if (msg.includes('mime')) return 'Unsupported file type.';
  return raw || 'Upload failed';
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
  image_url: string;
  storage_path: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  created_at: string;
}

async function hydratePhotos(rows: RawPhotoRow[], currentUserId: string | undefined): Promise<AlbumPhoto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const userIds = Array.from(new Set(rows.map((r) => r.uploaded_by)));

  const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
    supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
    supabase.from('album_photo_likes').select('photo_id, user_id').in('photo_id', ids),
    supabase.from('album_photo_comments').select('photo_id').in('photo_id', ids),
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
        .from('album_photos')
        .select('*')
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
      const { data, error } = await supabase.from('album_photos').select('*').eq('id', id!).maybeSingle();
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

          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('album-photos')
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          onProgress(item.id, { progress: 85 });

          const { data: urlData } = supabase.storage.from('album-photos').getPublicUrl(path);

          const { error: insertError } = await supabase.from('album_photos').insert({
            uploaded_by: user.id,
            image_url: urlData.publicUrl,
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
      // Delete storage object first (best-effort)
      await supabase.storage.from('album-photos').remove([photo.storage_path]);
      const { error } = await supabase.from('album_photos').delete().eq('id', photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album-photos'] });
      toast.success('Photo deleted');
    },
    onError: () => toast.error('Could not delete photo'),
  });
}
