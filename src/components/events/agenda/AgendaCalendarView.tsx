import { useState, useMemo } from 'react';
import { format, addDays, addMinutes, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AgendaCalendarItem, ROW_HEIGHT } from './AgendaCalendarItem';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  getLocalTimezone,
  getTimezoneAbbreviation,
  getDateInTimezone,
  isTodayInTimezone,
  getTimeInTimezone,
  createDateInTimezone,
} from '@/lib/timezoneUtils';
import type { AgendaItem } from '@/hooks/useAgendaItems';

interface AgendaCalendarViewProps {
  agendaItems: AgendaItem[];
  onEditItem: (item: AgendaItem) => void;
  onCreateItem: (dateTime: Date) => void;
  eventStartDate?: Date;
  startHour?: number;
  endHour?: number;
  eventTimezone?: string;
}

type TimezoneMode = 'local' | 'event';

interface TimeSlot {
  hour: number;
  minute: number;
}

function generateTimeSlots(startHour: number, endHour: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      slots.push({ hour, minute });
    }
  }
  return slots;
}

function getInitialStartDate(agendaItems: AgendaItem[], eventStartDate?: Date, timezone?: string): Date {
  if (agendaItems.length > 0) {
    // Use timezone-aware date extraction
    const dateStr = timezone 
      ? getDateInTimezone(agendaItems[0].starts_at, timezone)
      : format(new Date(agendaItems[0].starts_at), 'yyyy-MM-dd');
    return startOfDay(new Date(dateStr + 'T00:00:00'));
  }
  if (eventStartDate) {
    return startOfDay(eventStartDate);
  }
  return startOfDay(new Date());
}

export function AgendaCalendarView({
  agendaItems,
  onEditItem,
  onCreateItem,
  eventStartDate,
  startHour: defaultStartHour = 6,
  endHour: defaultEndHour = 22,
  eventTimezone = 'America/New_York',
}: AgendaCalendarViewProps) {
  const localTimezone = useMemo(() => getLocalTimezone(), []);
  const [timezoneMode, setTimezoneMode] = useState<TimezoneMode>('event');
  
  // Determine which timezone to use for display
  const displayTimezone = timezoneMode === 'event' ? eventTimezone : localTimezone;
  
  const [viewStartDate, setViewStartDate] = useState<Date>(() =>
    getInitialStartDate(agendaItems, eventStartDate, displayTimezone)
  );

  // Generate the 3 days to display
  const days = useMemo(() => {
    return [0, 1, 2].map(offset => addDays(viewStartDate, offset));
  }, [viewStartDate]);

  // Group items by day using timezone-aware date comparison
  const itemsByDay = useMemo(() => {
    const grouped: Record<string, AgendaItem[]> = {};
    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = agendaItems.filter(item => {
        // Get the date of this item in the display timezone
        const itemDateStr = getDateInTimezone(item.starts_at, displayTimezone);
        return itemDateStr === dayKey;
      });
    });
    return grouped;
  }, [agendaItems, days, displayTimezone]);

  // Calculate dynamic hours based on VISIBLE agenda items only (current 3-day period)
  const { startHour, endHour } = useMemo(() => {
    // Get only items from the visible 3-day period
    const visibleItems = days.flatMap(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      return itemsByDay[dayKey] || [];
    });

    if (visibleItems.length === 0) {
      return { startHour: defaultStartHour, endHour: defaultEndHour };
    }
    
    let earliest = 23;
    let latest = 0;
    
    visibleItems.forEach(item => {
      const startTime = getTimeInTimezone(item.starts_at, displayTimezone);
      const end = item.ends_at ? new Date(item.ends_at) : addMinutes(new Date(item.starts_at), 30);
      const endTime = getTimeInTimezone(end, displayTimezone);
      earliest = Math.min(earliest, startTime.hours);
      latest = Math.max(latest, endTime.hours + 1);
    });
    
    return {
      startHour: Math.min(earliest, defaultStartHour),
      endHour: Math.max(latest, defaultEndHour)
    };
  }, [days, itemsByDay, defaultStartHour, defaultEndHour, displayTimezone]);

  const timeSlots = useMemo(() => generateTimeSlots(startHour, endHour), [startHour, endHour]);
  const totalSlots = timeSlots.length;
  const gridHeight = totalSlots * ROW_HEIGHT;

  const handlePrevious = () => {
    setViewStartDate(prev => addDays(prev, -3));
  };

  const handleNext = () => {
    setViewStartDate(prev => addDays(prev, 3));
  };

  const handleToday = () => {
    setViewStartDate(getInitialStartDate(agendaItems, eventStartDate, displayTimezone));
  };

  // Calculate current time indicator position using display timezone
  const now = new Date();
  const currentTimePosition = useMemo(() => {
    const { hours: currentHour, minutes: currentMinute } = getTimeInTimezone(now, displayTimezone);
    
    if (currentHour < startHour || currentHour >= endHour) {
      return null;
    }
    
    const minutesFromStart = (currentHour - startHour) * 60 + currentMinute;
    return (minutesFromStart / 15) * ROW_HEIGHT;
  }, [now, startHour, endHour, displayTimezone]);

  // Check if a day is "today" in the display timezone
  const isDayToday = (day: Date) => isTodayInTimezone(day, displayTimezone);

  // Get timezone abbreviation for display
  const timezoneAbbr = getTimezoneAbbreviation(displayTimezone);

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex flex-col h-full">
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Timezone toggle */}
        <ToggleGroup
          type="single"
          value={timezoneMode}
          onValueChange={(value) => value && setTimezoneMode(value as TimezoneMode)}
          className="border rounded-lg"
        >
          <ToggleGroupItem value="local" aria-label="My timezone" className="px-3 text-xs">
            My Time
          </ToggleGroupItem>
          <ToggleGroupItem value="event" aria-label="Event timezone" className="px-3 text-xs">
            <Globe className="h-3 w-3 mr-1" />
            Event ({timezoneAbbr})
          </ToggleGroupItem>
        </ToggleGroup>

        <p className="text-sm text-muted-foreground">
          {format(days[0], 'MMM d')} - {format(days[2], 'MMM d, yyyy')}
        </p>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <div className="flex min-w-[600px]">
          {/* Time column */}
          <div className="flex-shrink-0 w-16 border-r bg-muted/30">
            {/* Header spacer */}
            <div className="h-12 border-b" />
            
            {/* Time labels */}
            <div className="relative" style={{ height: `${gridHeight}px` }}>
              {timeSlots.map((slot, index) => (
                <div
                  key={`${slot.hour}-${slot.minute}`}
                  className="absolute w-full text-right pr-2"
                  style={{ top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                >
                  {slot.minute === 0 && (
                    <span className="text-xs text-muted-foreground leading-6">
                      {format(new Date().setHours(slot.hour, 0), 'h a')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayItems = itemsByDay[dayKey] || [];
            const isCurrentDay = isDayToday(day);
            const showCurrentTime = isCurrentDay && currentTimePosition !== null;

            return (
              <div
                key={dayKey}
                className={cn(
                  'flex-1 min-w-[180px]',
                  dayIndex < 2 && 'border-r'
                )}
              >
                {/* Day header */}
                <div
                  className={cn(
                    'h-12 border-b flex flex-col items-center justify-center sticky top-0 z-10',
                    isCurrentDay ? 'bg-primary/10' : 'bg-background'
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {format(day, 'EEE')}
                  </span>
                  <span
                    className={cn(
                      'text-lg font-semibold',
                      isCurrentDay && 'text-primary'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Time grid with items */}
                <div className="relative" style={{ height: `${gridHeight}px` }}>
                {/* Clickable time slots */}
                  {timeSlots.map((slot, index) => (
                    <div
                      key={`slot-${slot.hour}-${slot.minute}`}
                      className={cn(
                        'absolute w-full cursor-crosshair hover:bg-muted/50 transition-colors border-t',
                        slot.minute === 0 ? 'border-border' : 'border-border/30'
                      )}
                      style={{ top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                      onClick={() => {
                        // When in event timezone mode, create date in event timezone
                        if (timezoneMode === 'event') {
                          const dateTime = createDateInTimezone(day, slot.hour, slot.minute, displayTimezone);
                          onCreateItem(dateTime);
                        } else {
                          const dateTime = new Date(day);
                          dateTime.setHours(slot.hour, slot.minute, 0, 0);
                          onCreateItem(dateTime);
                        }
                      }}
                    />
                  ))}

                  {/* Current time indicator */}
                  {showCurrentTime && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: `${currentTimePosition}px` }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <div className="flex-1 h-0.5 bg-destructive" />
                      </div>
                    </div>
                  )}

                  {/* Agenda items */}
                  {dayItems.map(item => (
                    <AgendaCalendarItem
                      key={item.id}
                      item={item}
                      startHour={startHour}
                      endHour={endHour}
                      onClick={onEditItem}
                      displayTimezone={displayTimezone}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
