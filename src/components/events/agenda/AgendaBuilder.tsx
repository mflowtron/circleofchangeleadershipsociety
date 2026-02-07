import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Calendar, Coffee, Utensils, Users, List, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { AgendaItemCard } from './AgendaItemCard';
import { AgendaItemForm } from './AgendaItemForm';
import { AgendaCalendarView } from './AgendaCalendarView';
import { getAgendaTypeConfig, AGENDA_ITEM_TYPES } from './AgendaTypeIcon';
import { useAgendaItems, type AgendaItem, type AgendaItemType } from '@/hooks/useAgendaItems';
import { useSpeakers } from '@/hooks/useSpeakers';
import { useEventById } from '@/hooks/useEvents';

interface AgendaBuilderProps {
  eventId: string;
}

export function AgendaBuilder({ eventId }: AgendaBuilderProps) {
  const { 
    agendaItems, 
    itemsByDate, 
    tracks,
    isLoading, 
    createAgendaItem, 
    updateAgendaItem, 
    deleteAgendaItem 
  } = useAgendaItems(eventId);
  const { speakers } = useSpeakers(eventId);
  const { data: event } = useEventById(eventId);
  
  const eventTimezone = event?.timezone || 'America/New_York';

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AgendaItem | null>(null);
  const [defaultItemType, setDefaultItemType] = useState<AgendaItemType>('session');
  const [defaultDateTime, setDefaultDateTime] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const handleAddItem = (type: AgendaItemType = 'session') => {
    setDefaultItemType(type);
    setDefaultDateTime(null);
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleCreateAtTime = (dateTime: Date) => {
    setDefaultDateTime(dateTime);
    setDefaultItemType('session');
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEditItem = (item: AgendaItem) => {
    setEditingItem(item);
    setDefaultItemType(item.item_type);
    setFormOpen(true);
  };

  const handleDeleteItem = async () => {
    if (deletingItem) {
      await deleteAgendaItem.mutateAsync(deletingItem.id);
      setDeletingItem(null);
    }
  };

  const handleSubmit = async (
    data: Parameters<typeof createAgendaItem.mutateAsync>[0]['item'],
    speakerAssignments: Parameters<typeof createAgendaItem.mutateAsync>[0]['speakerAssignments']
  ) => {
    if (editingItem) {
      await updateAgendaItem.mutateAsync({
        id: editingItem.id,
        updates: data,
        speakerAssignments,
      });
    } else {
      await createAgendaItem.mutateAsync({
        item: data,
        speakerAssignments,
      });
    }
  };

  const sortedDates = Object.keys(itemsByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded w-48" />
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold">Agenda</h2>
          <p className="text-sm text-muted-foreground">
            {agendaItems.length} items across {sortedDates.length} day{sortedDates.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as 'list' | 'calendar')}
            className="border rounded-lg"
          >
            <ToggleGroupItem value="list" aria-label="List view" className="px-3">
              <List className="h-4 w-4 mr-1" />
              List
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendar view" className="px-3">
              <CalendarDays className="h-4 w-4 mr-1" />
              Calendar
            </ToggleGroupItem>
          </ToggleGroup>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {AGENDA_ITEM_TYPES.map((type) => {
                const config = getAgendaTypeConfig(type);
                const Icon = config.icon;
                return (
                  <DropdownMenuItem 
                    key={type} 
                    onClick={() => handleAddItem(type)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {config.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick add buttons - only show in list view */}
      {viewMode === 'list' && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleAddItem('session')}>
            <Calendar className="h-4 w-4 mr-1" />
            Session
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddItem('break')}>
            <Coffee className="h-4 w-4 mr-1" />
            Break
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddItem('meal')}>
            <Utensils className="h-4 w-4 mr-1" />
            Meal
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddItem('networking')}>
            <Users className="h-4 w-4 mr-1" />
            Networking
          </Button>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="h-[600px]">
          <AgendaCalendarView
            agendaItems={agendaItems}
            onEditItem={handleEditItem}
            onCreateItem={handleCreateAtTime}
            eventTimezone={eventTimezone}
          />
        </div>
      )}

      {/* List View - Agenda items by date */}
      {viewMode === 'list' && (
        <>
          {sortedDates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No agenda items yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start building your event schedule by adding sessions, breaks, and more.
                </p>
                <Button onClick={() => handleAddItem('session')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((dateStr, dateIndex) => (
                <div key={dateStr}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                      <span className="text-xs font-medium text-primary uppercase">
                        {format(new Date(dateStr), 'EEE')}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {format(new Date(dateStr), 'd')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {format(new Date(dateStr), 'EEEE, MMMM d, yyyy')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {itemsByDate[dateStr].length} items
                      </p>
                    </div>
                  </div>

                  {/* Items for this date */}
                  <div className="space-y-3 pl-4 border-l-2 border-muted ml-8">
                    {itemsByDate[dateStr].map((item) => (
                      <AgendaItemCard
                        key={item.id}
                        item={item}
                        onEdit={handleEditItem}
                        onDelete={setDeletingItem}
                      />
                    ))}
                  </div>

                  {dateIndex < sortedDates.length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Form dialog */}
      <AgendaItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        defaultDateTime={defaultDateTime}
        eventId={eventId}
        speakers={speakers}
        existingTracks={tracks}
        onSubmit={handleSubmit}
        onDelete={setDeletingItem}
        isLoading={createAgendaItem.isPending || updateAgendaItem.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete agenda item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingItem?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
