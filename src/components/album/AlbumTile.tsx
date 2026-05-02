import { Heart, MessageCircle, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AlbumPhoto } from '@/types/album';

interface Props {
  photo: AlbumPhoto;
  onClick: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function AlbumTile({
  photo,
  onClick,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const initials = photo.uploader.full_name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleClick = () => {
    if (selectionMode) {
      onToggleSelect?.();
    } else {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-pressed={selectionMode ? selected : undefined}
      className={cn(
        'group relative block w-full mb-4 break-inside-avoid rounded-xl overflow-hidden bg-muted ring-1 ring-border transition-all shadow-sm hover:shadow-lg text-left',
        selectionMode
          ? selected
            ? 'ring-2 ring-primary shadow-lg'
            : 'hover:ring-primary/40'
          : 'hover:ring-2 hover:ring-primary',
      )}
    >
      <img
        src={photo.image_url}
        alt={photo.caption ?? 'Album photo'}
        loading="lazy"
        decoding="async"
        className={cn(
          'w-full h-auto block transition-all duration-500',
          selectionMode && selected ? 'scale-[0.97] brightness-90' : 'group-hover:scale-[1.03]',
        )}
      />

      {/* Selection checkbox overlay */}
      {selectionMode && (
        <div className="absolute top-2 right-2 z-10">
          <div
            className={cn(
              'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow-md',
              selected
                ? 'bg-primary border-primary text-primary-foreground scale-110'
                : 'bg-background/80 backdrop-blur border-white/80',
            )}
          >
            {selected && <Check className="h-4 w-4" strokeWidth={3} />}
          </div>
        </div>
      )}

      {/* Selected tint */}
      {selectionMode && selected && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
      )}

      {/* Hover overlay (hidden in selection mode) */}
      {!selectionMode && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-x-0 bottom-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-7 w-7 ring-2 ring-white/40">
                <AvatarImage src={photo.uploader.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{photo.uploader.full_name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm shrink-0">
              <span className="flex items-center gap-1">
                <Heart className={`h-4 w-4 ${photo.user_has_liked ? 'fill-current text-primary' : ''}`} />
                {photo.likes_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {photo.comments_count}
              </span>
            </div>
          </div>
        </>
      )}
    </button>
  );
}
