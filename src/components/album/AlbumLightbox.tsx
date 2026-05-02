import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Heart, Download, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { formatDistanceToNow } from 'date-fns';
import { useToggleAlbumLike } from '@/hooks/useAlbumLikes';
import { useDeleteAlbumPhoto } from '@/hooks/useAlbumPhotos';
import { useAuth } from '@/contexts/AuthContext';
import { AlbumCommentList } from './AlbumCommentList';
import type { AlbumPhoto } from '@/types/album';
import { toast } from 'sonner';

interface Props {
  photos: AlbumPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function AlbumLightbox({ photos, index, onIndexChange, onClose }: Props) {
  const { user, isAdmin } = useAuth();
  const photo = photos[index];
  const toggleLike = useToggleAlbumLike();
  const deletePhoto = useDeleteAlbumPhoto();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const goPrev = useCallback(() => {
    if (index > 0) onIndexChange(index - 1);
  }, [index, onIndexChange]);

  const goNext = useCallback(() => {
    if (index < photos.length - 1) onIndexChange(index + 1);
  }, [index, photos.length, onIndexChange]);

  const isTypingTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    // Inside a Radix dialog (e.g. delete confirmation) — let it own keys
    if (target.closest('[role="dialog"][data-state="open"]')) return true;
    return false;
  };

  // Keyboard navigation — ignore when user is typing or another dialog is open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (confirmDelete) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.key === 'l' || e.key === 'L') && photo) {
        e.preventDefault();
        toggleLike.mutate({ photoId: photo.id, hasLiked: photo.user_has_liked });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose, photo, toggleLike, confirmDelete]);

  // Lock body scroll + manage focus (save/restore + focus container on mount)
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    // Defer focus until after the portal mounts
    const id = window.requestAnimationFrame(() => {
      containerRef.current?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(id);
      document.body.style.overflow = '';
      // Restore focus to the trigger if it's still in the DOM
      const prev = previouslyFocusedRef.current;
      if (prev && document.contains(prev)) {
        prev.focus({ preventScroll: true });
      }
    };
  }, []);

  // Prefetch neighbors
  useEffect(() => {
    [photos[index - 1], photos[index + 1]].forEach((p) => {
      if (p) {
        const img = new Image();
        img.src = p.image_url;
      }
    });
  }, [index, photos]);

  if (!photo) return null;

  const initials = photo.uploader.full_name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const canDelete = user?.id === photo.uploaded_by || isAdmin;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await fetch(photo.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = photo.storage_path.split('.').pop() ?? 'jpg';
      a.download = `coclc-album-${photo.id.slice(0, 8)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not download photo');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    // Snapshot navigation intent BEFORE awaiting — the photos array changes
    // when the query invalidates on success.
    const wasLast = photos.length === 1;
    const wasEnd = index === photos.length - 1;
    try {
      await deletePhoto.mutateAsync(photo);
      setConfirmDelete(false);
      if (wasLast) {
        onClose();
      } else if (wasEnd) {
        onIndexChange(index - 1);
      }
    } catch {
      // Toast is shown by the mutation's onError; keep dialog open so the
      // user can retry or cancel.
    }
  };

  // Backdrop click handling — close only when both press and release happen on
  // the backdrop itself (not on the image, controls, side panel, or dialogs).
  // Using mousedown/up (not click) prevents focus loss from inputs in the side
  // panel: a click never fires on the backdrop after a focused input blurs.
  const backdropPressedRef = useRef(false);

  const isBackdropTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    // The element must be the backdrop wrapper itself.
    return target.dataset.lightboxBackdrop === 'true';
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    backdropPressedRef.current = isBackdropTarget(e.target);
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const releasedOnBackdrop = isBackdropTarget(e.target);
    if (backdropPressedRef.current && releasedOnBackdrop) {
      // Only close if a real form control isn't actively being interacted with.
      if (!isTypingTarget(document.activeElement)) {
        onClose();
      }
    }
    backdropPressedRef.current = false;
  };

  // ---------- Touch swipe handling (mobile) ----------
  // Swipe left  → next photo
  // Swipe right → previous photo
  // Swipe down  → close
  const SWIPE_THRESHOLD = 60; // px
  const SWIPE_AXIS_LOCK = 12; // px before deciding axis
  const touchRef = useRef<{
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    axis: 'x' | 'y' | null;
    active: boolean;
  } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    if (isTypingTarget(e.target)) return;
    const t = e.touches[0];
    touchRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      dx: 0,
      dy: 0,
      axis: null,
      active: true,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const ref = touchRef.current;
    if (!ref || !ref.active) return;
    const t = e.touches[0];
    ref.dx = t.clientX - ref.startX;
    ref.dy = t.clientY - ref.startY;

    if (!ref.axis) {
      if (Math.abs(ref.dx) > SWIPE_AXIS_LOCK || Math.abs(ref.dy) > SWIPE_AXIS_LOCK) {
        ref.axis = Math.abs(ref.dx) > Math.abs(ref.dy) ? 'x' : 'y';
      }
    }

    if (ref.axis === 'x') {
      setSwipeOffset({ x: ref.dx, y: 0 });
    } else if (ref.axis === 'y' && ref.dy > 0) {
      // Only follow downward drags for dismiss
      setSwipeOffset({ x: 0, y: ref.dy });
    }
  };

  const handleTouchEnd = () => {
    const ref = touchRef.current;
    if (!ref || !ref.active) return;
    ref.active = false;

    if (ref.axis === 'x' && Math.abs(ref.dx) > SWIPE_THRESHOLD) {
      if (ref.dx < 0) goNext();
      else goPrev();
    } else if (ref.axis === 'y' && ref.dy > SWIPE_THRESHOLD) {
      onClose();
    }

    setSwipeOffset({ x: 0, y: 0 });
    touchRef.current = null;
  };

  const handleTouchCancel = () => {
    if (touchRef.current) touchRef.current.active = false;
    setSwipeOffset({ x: 0, y: 0 });
    touchRef.current = null;
  };

  const isSwiping = swipeOffset.x !== 0 || swipeOffset.y !== 0;
  const swipeOpacity = swipeOffset.y > 0 ? Math.max(0.4, 1 - swipeOffset.y / 400) : 1;

  const content = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
      data-lightbox-backdrop="true"
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md animate-fade-in flex flex-col lg:flex-row outline-none"
      style={{ backgroundColor: `rgba(0,0,0,${0.95 * swipeOpacity})` }}
    >
      {/* Close button — pinned within the image area so the side panel never covers it */}
      <button
        onClick={onClose}
        className="absolute z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur flex items-center justify-center text-white shadow-lg ring-1 ring-white/20 transition top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] lg:left-auto lg:right-[calc(24rem+1rem)]"
        aria-label="Close photo viewer"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image area — also acts as a backdrop region around the image */}
      <div
        data-lightbox-backdrop="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className="relative flex-1 flex items-center justify-center min-h-0 p-4 lg:p-8 touch-pan-y select-none"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Prev */}
        {index > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition"
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        <img
          key={photo.id}
          src={photo.image_url}
          alt={photo.caption ?? 'Album photo'}
          draggable={false}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-fade-in will-change-transform"
          style={{
            transform: `translate3d(${swipeOffset.x}px, ${swipeOffset.y}px, 0)`,
            transition: isSwiping ? 'none' : 'transform 220ms ease-out',
          }}
        />

        {/* Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-white text-xs font-medium">
          {index + 1} / {photos.length}
        </div>
      </div>

      {/* Side panel */}
      <div className="w-full lg:w-96 lg:h-full bg-background border-t lg:border-t-0 lg:border-l border-border flex flex-col max-h-[55vh] lg:max-h-none">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={photo.uploader.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{photo.uploader.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(photo.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {photo.caption && (
            <p className="text-sm mt-3 whitespace-pre-wrap break-words">{photo.caption}</p>
          )}

          <div className="flex items-center gap-1 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toggleLike.mutate({ photoId: photo.id, hasLiked: photo.user_has_liked })
              }
              className="gap-1.5"
            >
              <Heart
                className={`h-4 w-4 ${
                  photo.user_has_liked ? 'fill-primary text-primary' : ''
                }`}
              />
              {photo.likes_count}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="gap-1.5"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={deletePhoto.isPending}
                className="gap-1.5 text-destructive hover:text-destructive ml-auto"
                aria-label="Delete photo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 p-4">
          <AlbumCommentList photoId={photo.id} />
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the photo and all its comments and likes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePhoto.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deletePhoto.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePhoto.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return createPortal(content, document.body);
}
