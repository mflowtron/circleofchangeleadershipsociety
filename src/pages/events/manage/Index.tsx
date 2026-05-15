import { Link } from 'react-router-dom';
import { useEvents } from '@/hooks/useEvents';
import { format } from 'date-fns';
import { Plus, Calendar, Edit, Trash2, Eye, EyeOff, Ticket, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';

export default function ManageEventsIndex() {
  const { events, isLoading, deleteEvent, isDeleting } = useEvents();

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Manage Events</h1>
          <p className="text-muted-foreground">Create and manage your events</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/events/manage/new">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Event</span>
            <span className="sm:hidden">New</span>
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border animate-pulse">
          <div className="h-64 bg-muted" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 rounded-lg border bg-card">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No events yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first event to get started
          </p>
          <Button asChild>
            <Link to="/events/manage/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </div>
      ) : (
        <ResponsiveTable className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap min-w-[180px]">Event</TableHead>
                <TableHead className="whitespace-nowrap min-w-[180px]">Date</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium whitespace-nowrap">{event.title}</div>
                    {event.venue_name && (
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {event.venue_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(event.starts_at), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell>
                    {event.is_published ? (
                      <Badge className="gap-1 whitespace-nowrap">
                        <Eye className="h-3 w-3" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 whitespace-nowrap">
                        <EyeOff className="h-3 w-3" />
                        Draft
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Orders">
                        <Link to={`/events/manage/${event.id}/orders`}>
                          <ShoppingCart className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Tickets">
                        <Link to={`/events/manage/${event.id}/tickets`}>
                          <Ticket className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Edit">
                        <Link to={`/events/manage/${event.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Event</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{event.title}"?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(event.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTable>
      )}
    </div>
  );
}
