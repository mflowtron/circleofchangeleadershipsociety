import { Heart, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { AlbumPhoto } from '@/types/album';

interface Props {
  photo: AlbumPhoto;
  onClick: () => void;
}

export function AlbumTile({ photo, onClick }: Props) {
  const initials = photo.uploader.full_name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className="group relative block w-full mb-4 break-inside-avoid rounded-xl overflow-hidden bg-muted ring-1 ring-border hover:ring-2 hover:ring-primary transition-all shadow-sm hover:shadow-lg text-left"
    >
      <img
        src={photo.image_url}
        alt={photo.caption ?? 'Album photo'}
        loading="lazy"
        decoding="async"
        className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
      />
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
    </button>
  );
}
