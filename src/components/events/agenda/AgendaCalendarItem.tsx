import { format, differenceInMinutes, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { AgendaTypeIcon, getAgendaTypeConfig } from './AgendaTypeIcon';
import type { AgendaItem, AgendaItemType } from '@/hooks/useAgendaItems';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ROW_HEIGHT = 24; // pixels per 15-minute slot

const ITEM_TYPE_COLORS: Record<AgendaItemType, string> = {
  session: 'bg-primary/20 border-primary/50 hover:bg-primary/30',
  break: 'bg-muted border-muted-foreground/30 hover:bg-muted/80',
  meal: 'bg-orange-500/20 border-orange-500/50 hover:bg-orange-500/30',
  networking: 'bg-green-500/20 border-green-500/50 hover:bg-green-500/30',
  other: 'bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30',
};

interface AgendaCalendarItemProps {
  item: AgendaItem;
  startHour: number;
  endHour: number;
  onClick: (item: AgendaItem) => void;
}

export function AgendaCalendarItem({ item, startHour, endHour, onClick }: AgendaCalendarItemProps) {
  const itemStart = new Date(item.starts_at);
  const itemEnd = item.ends_at ? new Date(item.ends_at) : addMinutes(itemStart, 30);
  
  // Get local hours for visibility check
  const itemStartHour = itemStart.getHours() + itemStart.getMinutes() / 60;
  const itemEndHour = itemEnd.getHours() + itemEnd.getMinutes() / 60;
  
  // Skip rendering if completely outside visible range
  if (itemEndHour <= startHour || itemStartHour >= endHour) {
    return null;
  }
  
  // Calculate position relative to the grid start hour using local time
  const gridStartMinutes = startHour * 60;
  const itemStartMinutes = itemStart.getHours() * 60 + itemStart.getMinutes();
  const minutesFromGridStart = itemStartMinutes - gridStartMinutes;
  
  // Clamp to visible area if item starts before grid
  const clampedMinutesFromStart = Math.max(0, minutesFromGridStart);
  const topPosition = (clampedMinutesFromStart / 15) * ROW_HEIGHT;
  
  // Calculate height based on duration, adjusting if clamped
  const durationMinutes = differenceInMinutes(itemEnd, itemStart);
  const visibleDuration = minutesFromGridStart < 0 
    ? durationMinutes + minutesFromGridStart 
    : durationMinutes;
  
  // Also clamp if item extends past grid end
  const gridEndMinutes = endHour * 60;
  const itemEndMinutes = itemEnd.getHours() * 60 + itemEnd.getMinutes();
  const finalVisibleDuration = itemEndMinutes > gridEndMinutes 
    ? visibleDuration - (itemEndMinutes - gridEndMinutes)
    : visibleDuration;
  
  const heightRows = Math.max(1, finalVisibleDuration / 15);
  const height = heightRows * ROW_HEIGHT;
  
  const config = getAgendaTypeConfig(item.item_type);
  const colorClass = ITEM_TYPE_COLORS[item.item_type] || ITEM_TYPE_COLORS.other;
  
  // Determine if we have enough space to show content
  const isCompact = heightRows <= 2;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick(item)}
          className={cn(
            'absolute left-1 right-1 rounded-md border px-2 py-1 text-left transition-colors cursor-pointer overflow-hidden',
            colorClass
          )}
          style={{
            top: `${topPosition}px`,
            height: `${height}px`,
            minHeight: `${ROW_HEIGHT}px`,
          }}
        >
          <div className="flex items-start gap-1 h-full overflow-hidden">
            {!isCompact && (
              <AgendaTypeIcon type={item.item_type} size="sm" className="flex-shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1 overflow-hidden flex flex-col">
              <p className={cn(
                'font-medium truncate line-clamp-1',
                isCompact ? 'text-xs' : 'text-sm'
              )}>
                {item.title}
              </p>
              {!isCompact && (
                <p className="text-xs text-muted-foreground truncate line-clamp-1 flex-shrink-0">
                  {format(itemStart, 'h:mm a')} - {format(itemEnd, 'h:mm a')}
                </p>
              )}
            </div>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs z-50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AgendaTypeIcon type={item.item_type} size="sm" />
            <span className="font-semibold">{item.title}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(itemStart, 'h:mm a')} - {format(itemEnd, 'h:mm a')}
          </p>
          {item.location && (
            <p className="text-sm">📍 {item.location}</p>
          )}
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          )}
          {item.speakers && item.speakers.length > 0 && (
            <p className="text-sm">
              🎤 {item.speakers.map(s => s.speaker?.name).filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export { ROW_HEIGHT };
