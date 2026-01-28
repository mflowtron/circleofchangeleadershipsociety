import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Plus, Pencil, Trash2, ExternalLink, Calendar, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLMSEvents, type LMSEvent, type CreateLMSEventInput } from '@/hooks/useLMSEvents';
import { generateICSContent, downloadICS } from '@/lib/calendarUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CircleLoader } from '@/components/ui/circle-loader';

function EventCard({ event }: { event: LMSEvent }) {
  const startsAt = new Date(event.starts_at);
  const endsAt = event.ends_at ? new Date(event.ends_at) : null;

  const handleAddToCalendar = () => {
    const icsContent = generateICSContent({
      title: event.title,
      description: event.description,
      startsAt,
      endsAt,
      meetingLink: event.meeting_link,
    });
    downloadICS(icsContent, event.title);
  };

  const formatEventTime = () => {
    const dateStr = format(startsAt, 'EEE, MMM d');
    const startTime = format(startsAt, 'h:mm a');
    if (endsAt) {
      const endTime = format(endsAt, 'h:mm a');
      return `${dateStr} · ${startTime} - ${endTime}`;
    }
    return `${dateStr} · ${startTime}`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatEventTime()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {event.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-2">
          {event.meeting_link && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => window.open(event.meeting_link!, '_blank')}
            >
              <Video className="h-4 w-4" />
              Join Meeting
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleAddToCalendar}
          >
            <Calendar className="h-4 w-4" />
            Add to Calendar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface EventFormData {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  meeting_link: string;
  is_active: boolean;
}

const initialFormData: EventFormData = {
  title: '',
  description: '',
  starts_at: '',
  ends_at: '',
  meeting_link: '',
  is_active: true,
};

function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: LMSEvent;
  onSubmit: (data: EventFormData) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<EventFormData>(() => {
    if (event) {
      return {
        title: event.title,
        description: event.description || '',
        starts_at: event.starts_at.slice(0, 16), // Format for datetime-local input
        ends_at: event.ends_at?.slice(0, 16) || '',
        meeting_link: event.meeting_link || '',
        is_active: event.is_active,
      };
    }
    return initialFormData;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
            <DialogDescription>
              {event ? 'Update the event details below.' : 'Fill in the details for the new event.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Weekly Leadership Call"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Join us for our weekly discussion..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="starts_at">Start Date/Time *</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ends_at">End Date/Time</Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting_link">Meeting Link</Label>
              <Input
                id="meeting_link"
                type="url"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active (visible to users)</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LMSEvents() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { events, upcomingEvents, isLoading, createEvent, updateEvent, deleteEvent } = useLMSEvents();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LMSEvent | undefined>();
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  const handleCreateOrUpdate = (data: EventFormData) => {
    const eventInput: CreateLMSEventInput = {
      title: data.title,
      description: data.description || null,
      starts_at: new Date(data.starts_at).toISOString(),
      ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
      meeting_link: data.meeting_link || null,
      is_active: data.is_active,
    };

    if (editingEvent) {
      updateEvent.mutate(
        { id: editingEvent.id, ...eventInput },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingEvent(undefined);
          },
        }
      );
    } else {
      createEvent.mutate(eventInput, {
        onSuccess: () => {
          setIsFormOpen(false);
        },
      });
    }
  };

  const handleEdit = (event: LMSEvent) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteEventId) {
      deleteEvent.mutate(deleteEventId, {
        onSuccess: () => setDeleteEventId(null),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <CircleLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            Upcoming Events
          </h1>
          <p className="text-muted-foreground mt-1">
            View and join scheduled meetings and events
          </p>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
          {isAdmin && <TabsTrigger value="manage">Manage Events</TabsTrigger>}
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No upcoming events</h3>
                <p className="text-muted-foreground text-sm text-center">
                  There are no scheduled events at this time. Check back later!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="manage" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditingEvent(undefined);
                  setIsFormOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No events created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="font-medium">{event.title}</div>
                          {event.meeting_link && (
                            <a
                              href={event.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Meeting link
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>{format(new Date(event.starts_at), 'MMM d, yyyy')}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(event.starts_at), 'h:mm a')}
                            {event.ends_at && ` - ${format(new Date(event.ends_at), 'h:mm a')}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={event.is_active ? 'default' : 'secondary'}>
                            {event.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(event)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteEventId(event.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <EventFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingEvent(undefined);
        }}
        event={editingEvent}
        onSubmit={handleCreateOrUpdate}
        isSubmitting={createEvent.isPending || updateEvent.isPending}
      />

      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
