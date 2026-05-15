import { Linkedin, Twitter, Globe, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Speaker } from '@/hooks/useSpeakers';

interface SpeakerCardProps {
  speaker: Speaker;
  onEdit?: (speaker: Speaker) => void;
  onDelete?: (speaker: Speaker) => void;
  compact?: boolean;
}

export function SpeakerCard({ speaker, onEdit, onDelete, compact = false }: SpeakerCardProps) {
  const initials = speaker.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={speaker.photo_url || undefined} alt={speaker.name} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{speaker.name}</p>
          {speaker.title && (
            <p className="text-xs text-muted-foreground truncate">{speaker.title}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={speaker.photo_url || undefined} alt={speaker.name} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{speaker.name}</h3>
                {(speaker.title || speaker.company) && (
                  <p className="text-sm text-muted-foreground truncate">
                    {speaker.title}
                    {speaker.title && speaker.company && ' at '}
                    {speaker.company}
                  </p>
                )}
              </div>
              
              {(onEdit || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(speaker)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={() => onDelete(speaker)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {speaker.bio && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {speaker.bio}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-3">
              {speaker.linkedin_url && (
                <a 
                  href={speaker.linkedin_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {speaker.twitter_url && (
                <a 
                  href={speaker.twitter_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {speaker.website_url && (
                <a 
                  href={speaker.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
