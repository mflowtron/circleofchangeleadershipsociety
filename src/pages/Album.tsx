import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Images, Plus, Loader2, CheckSquare, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAlbumPhotos, useBulkDeleteAlbumPhotos } from '@/hooks/useAlbumPhotos';
import { AlbumTile } from '@/components/album/AlbumTile';
import { AlbumLightbox } from '@/components/album/AlbumLightbox';
import { AlbumUploadDialog } from '@/components/album/AlbumUploadDialog';
import { useAuth } from '@/contexts/AuthContext';
import type { AlbumFilter } from '@/types/album';
import { cn } from '@/lib/utils';

const FILTERS: { id: AlbumFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My Uploads' },
  { id: 'top', label: 'Most Liked' },
];

export default function Album() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { photoId } = useParams<{ photoId?: string }>();
  const [filter, setFilter] = useState<AlbumFilter>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useAlbumPhotos(filter);

  const photos = useMemo(() => data?.pages.flatMap((p) => p.photos) ?? [], [data]);

  const bulkDelete = useBulkDeleteAlbumPhotos();

  // Reset selection when filter changes or selection mode is exited.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter, selectionMode]);

  // Drop ids that no longer exist (e.g. after a delete or refetch).
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const valid = new Set(photos.map((p) => p.id));
    let changed = false;
    const next = new Set<string>();
    selectedIds.forEach((id) => {
      if (valid.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelectedIds(next);
  }, [photos, selectedIds]);

  // Lightbox index from URL
  const lightboxIndex = useMemo(() => {
    if (!photoId) return -1;
    return photos.findIndex((p) => p.id === photoId);
  }, [photoId, photos]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const openPhoto = (id: string) => navigate(`/lms/album/${id}`);
  const closePhoto = () => navigate('/lms/album');
  const setLightboxIndex = (i: number) => {
    const p = photos[i];
    if (p) navigate(`/lms/album/${p.id}`, { replace: true });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const targets = photos.filter((p) => selectedIds.has(p.id));
    if (targets.length === 0) {
      setConfirmBulkDelete(false);
      return;
    }
    try {
      await bulkDelete.mutateAsync(targets);
      setConfirmBulkDelete(false);
      exitSelectionMode();
    } catch {
      // Toast handled by mutation onError; keep dialog open for retry.
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-screen">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(345_60%_18%)] via-[hsl(345_70%_12%)] to-black text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_50%)]" />
        <div className="relative px-4 sm:px-6 lg:px-10 py-8 sm:py-10 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-medium uppercase tracking-wider mb-3">
                <Images className="h-3.5 w-3.5" />
                Society
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold">
                Shared Album
              </h1>
              <p className="text-white/70 mt-2 max-w-xl">
                Memories from our community — uploaded by members, for members.
                {photos.length > 0 && (
                  <span className="ml-1 text-white/50">
                    · {photos.length} photo{photos.length === 1 ? '' : 's'}
                  </span>
                )}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setUploadOpen(true)}
              disabled={!user}
              className="shadow-lg shadow-primary/20"
            >
              <Plus className="h-5 w-5 mr-2" />
              Upload Photos
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
        {/* Filters + admin select toggle */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              disabled={selectionMode}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap border',
                filter === f.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40',
                selectionMode && 'opacity-50 cursor-not-allowed',
              )}
            >
              {f.label}
            </button>
          ))}

          {isAdmin && photos.length > 0 && (
            <button
              onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
              className={cn(
                'ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap border shrink-0',
                selectionMode
                  ? 'bg-destructive/10 text-destructive border-destructive/40'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40',
              )}
            >
              {selectionMode ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select
                </>
              )}
            </button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full mb-4 rounded-xl"
                style={{ height: 150 + ((i * 47) % 180) }}
              />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Images className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl mb-2">
              {filter === 'mine' ? "You haven't uploaded any photos yet" : 'The album is empty'}
            </h2>
            <p className="text-muted-foreground mb-5">
              Be the first to share a memory with the community.
            </p>
            <Button onClick={() => setUploadOpen(true)} disabled={!user}>
              <Plus className="h-4 w-4 mr-2" />
              Upload your first photo
            </Button>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4',
                // Pad bottom so the floating action bar doesn't cover content.
                selectionMode && 'pb-28',
              )}
            >
              {photos.map((photo) => (
                <AlbumTile
                  key={photo.id}
                  photo={photo}
                  onClick={() => openPhoto(photo.id)}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(photo.id)}
                  onToggleSelect={() => toggleSelect(photo.id)}
                />
              ))}
            </div>
            <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-4">
              {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
          </>
        )}
      </div>

      {/* Floating selection action bar */}
      {selectionMode && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40 animate-fade-in"
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-background border border-border shadow-2xl backdrop-blur">
            <span className="px-3 text-sm font-medium">
              {selectedCount} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={exitSelectionMode}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedCount === 0 || bulkDelete.isPending}
              onClick={() => setConfirmBulkDelete(true)}
              className="rounded-full"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} photo{selectedCount === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected photo{selectedCount === 1 ? '' : 's'} and
              all their comments and likes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDelete();
              }}
              disabled={bulkDelete.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDelete.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                `Delete ${selectedCount}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlbumUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      {lightboxIndex >= 0 && !selectionMode && (
        <AlbumLightbox
          photos={photos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={closePhoto}
        />
      )}
    </div>
  );
}
