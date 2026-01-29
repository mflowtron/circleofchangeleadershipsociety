import { format } from 'date-fns';
import { Clock, MapPin, MoreVertical, Pencil, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgendaTypeIcon } from './AgendaTypeIcon';
import { SpeakerCard } from './SpeakerCard';
import type { AgendaItem } from '@/hooks/useAgendaItems';
import { cn } from '@/lib/utils';

interface AgendaItemCardProps {
  item: AgendaItem;
  onEdit?: (item: AgendaItem) => void;
  onDelete?: (item: AgendaItem) => void;
  showDate?: boolean;
  compact?: boolean;
}

export function AgendaItemCard({ 
  item, 
  onEdit, 
  onDelete,
  showDate = false,
  compact = false,
}: AgendaItemCardProps) {
  const startTime = format(new Date(item.starts_at), 'h:mm a');
  const endTime = item.ends_at ? format(new Date(item.ends_at), 'h:mm a') : null;
  const dateStr = format(new Date(item.starts_at), 'EEE, MMM d');

  const isSession = item.item_type === 'session';
  const hasSpeakers = item.speakers && item.speakers.length > 0;

  return (
    <Card className={cn(
      item.is_highlighted && 'ring-2 ring-primary',
      compact && 'shadow-sm'
    )}>
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start gap-3">
          <AgendaTypeIcon type={item.item_type} size={compact ? 'sm' : 'md'} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={cn(
                    'font-semibold',
                    compact ? 'text-sm' : 'text-base'
                  )}>
                    {item.title}
                  </h3>
                  {item.is_highlighted && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Featured
                    </Badge>
                  )}
                  {item.track && (
                    <Badge variant="outline" className="text-xs">
                      {item.track}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {showDate && `${dateStr}, `}
                      {startTime}
                      {endTime && ` - ${endTime}`}
                    </span>
                  </div>
                  {item.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{item.location}</span>
                    </div>
                  )}
                </div>
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
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={() => onDelete(item)}
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

            {item.description && !compact && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Speakers */}
            {isSession && hasSpeakers && !compact && (
              <div className="mt-3 flex flex-wrap gap-3">
                {item.speakers?.map((itemSpeaker) => (
                  itemSpeaker.speaker && (
                    <div key={itemSpeaker.id} className="flex items-center gap-2">
                      <SpeakerCard speaker={itemSpeaker.speaker} compact />
                      {itemSpeaker.role !== 'speaker' && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {itemSpeaker.role}
                        </Badge>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Compact speaker list */}
            {isSession && hasSpeakers && compact && (
              <p className="text-xs text-muted-foreground mt-1">
                {item.speakers?.map(s => s.speaker?.name).filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
