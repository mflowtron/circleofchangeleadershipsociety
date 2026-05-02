import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Images, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlbumPhotos } from '@/hooks/useAlbumPhotos';
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { photoId } = useParams<{ photoId?: string }>();
  const [filter, setFilter] = useState<AlbumFilter>('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useAlbumPhotos(filter);

  const photos = useMemo(() => data?.pages.flatMap((p) => p.photos) ?? [], [data]);

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
        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap border',
                filter === f.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40',
              )}
            >
              {f.label}
            </button>
          ))}
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
            <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4">
              {photos.map((photo) => (
                <AlbumTile key={photo.id} photo={photo} onClick={() => openPhoto(photo.id)} />
              ))}
            </div>
            <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-4">
              {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
          </>
        )}
      </div>

      <AlbumUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      {lightboxIndex >= 0 && (
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
