import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Ticket } from 'lucide-react';
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
import { TicketTypeForm } from '@/components/events/TicketTypeForm';
import { useEventById } from '@/hooks/useEvents';
import { useTicketTypes, type TicketType } from '@/hooks/useTicketTypes';

export default function ManageTickets() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading: isLoadingEvent } = useEventById(id || '');
  const {
    ticketTypes,
    isLoading: isLoadingTickets,
    createTicketType,
    updateTicketType,
    deleteTicketType,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTicketTypes(id || '');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);

  const handleCreate = () => {
    setEditingTicket(null);
    setFormOpen(true);
  };

  const handleEdit = (ticket: TicketType) => {
    setEditingTicket(ticket);
    setFormOpen(true);
  };

  const handleSubmit = async (data: any) => {
    if (editingTicket) {
      await updateTicketType(data);
    } else {
      await createTicketType(data);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (isLoadingEvent) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-2">Event not found</h1>
        <Button asChild>
          <Link to="/events/manage">Back to Events</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
            <Link to="/events/manage">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Manage Tickets</h1>
            <p className="text-muted-foreground truncate">{event.title}</p>
          </div>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Ticket Type</span>
          <span className="sm:hidden">Add Ticket</span>
        </Button>
      </div>

      {isLoadingTickets ? (
        <div className="rounded-lg border animate-pulse">
          <div className="h-48 bg-muted" />
        </div>
      ) : ticketTypes.length === 0 ? (
        <div className="text-center py-16 rounded-lg border bg-card">
          <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No ticket types yet</h2>
          <p className="text-muted-foreground mb-4">
            Add ticket types to allow registrations
          </p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Ticket Type
          </Button>
        </div>
      ) : (
        <ResponsiveTable className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap min-w-[150px]">Name</TableHead>
                <TableHead className="whitespace-nowrap">Type</TableHead>
                <TableHead className="whitespace-nowrap">Price</TableHead>
                <TableHead className="whitespace-nowrap">Sold / Available</TableHead>
                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketTypes.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="font-medium whitespace-nowrap">{ticket.name}</div>
                    {ticket.description && (
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {ticket.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ticket.is_virtual ? 'secondary' : 'default'}>
                      {ticket.is_virtual ? '💻 Virtual' : '🏠 In-Person'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.price_cents === 0 ? (
                      <Badge variant="secondary">Free</Badge>
                    ) : (
                      <span className="whitespace-nowrap">{formatPrice(ticket.price_cents)}</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {ticket.quantity_sold}
                    {ticket.quantity_available
                      ? ` / ${ticket.quantity_available}`
                      : ' / ∞'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(ticket)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Ticket Type</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{ticket.name}"?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTicketType(ticket.id)}
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

      <TicketTypeForm
        eventId={id || ''}
        ticketType={editingTicket}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdating}
      />
    </div>
  );
}
