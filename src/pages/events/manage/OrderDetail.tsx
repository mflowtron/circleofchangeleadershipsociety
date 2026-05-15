import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Phone, Check, X, Pencil, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { useOrder } from '@/hooks/useOrders';
import { useOrderAttendees, useUpdateAttendee, Attendee } from '@/hooks/useAttendees';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
  refunded: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading: orderLoading } = useOrder(orderId);
  const { data: attendees = [], isLoading: attendeesLoading } = useOrderAttendees(orderId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const updateAttendee = useUpdateAttendee();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const startEdit = (attendee: Attendee) => {
    setEditingId(attendee.id);
    setEditName(attendee.attendee_name || '');
    setEditEmail(attendee.attendee_email || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditEmail('');
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      await updateAttendee.mutateAsync({
        id: editingId,
        attendee_name: editName || null,
        attendee_email: editEmail || null,
      });
      toast.success('Attendee updated');
      cancelEdit();
    } catch (error) {
      toast.error('Failed to update attendee');
    }
  };

  if (orderLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Order not found</h2>
        <Link to="/events/manage/orders">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const completeCount = attendees.filter(
    (a) => a.attendee_name && a.attendee_email
  ).length;
  const incompleteCount = attendees.length - completeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Link to="/events/manage/orders">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold font-mono truncate">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), 'MMMM d, yyyy')}
            <span className="hidden sm:inline"> at {format(new Date(order.created_at), 'h:mm a')}</span>
          </p>
        </div>
        <Badge variant="outline" className={`${statusColors[order.status]} flex-shrink-0`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{order.full_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${order.email}`} className="text-primary hover:underline">
                {order.email}
              </a>
            </div>
            {order.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${order.phone}`} className="text-primary hover:underline">
                  {order.phone}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.ticket_type?.name || 'Unknown'} × {item.quantity}
                  </span>
                  <span>{formatCurrency(item.unit_price_cents * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal_cents)}</span>
                </div>
                {order.fees_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fees</span>
                    <span>{formatCurrency(order.fees_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(order.total_cents)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendees Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-lg">Attendees</CardTitle>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-sm">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground text-xs sm:text-sm">Total:</span>
                <Badge variant="secondary">{attendees.length}</Badge>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground text-xs sm:text-sm">Complete:</span>
                <Badge variant="default" className="bg-green-600">
                  {completeCount}
                </Badge>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground text-xs sm:text-sm">Incomplete:</span>
                <Badge variant="destructive">{incompleteCount}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {attendeesLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : attendees.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No attendees for this order
            </p>
          ) : (
            <ResponsiveTable className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Ticket</TableHead>
                    <TableHead>Attendee</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendees.map((attendee) => {
                    const isComplete = attendee.attendee_name && attendee.attendee_email;
                    const isEditing = editingId === attendee.id;

                    return (
                      <TableRow key={attendee.id}>
                        <TableCell>
                          {isComplete ? (
                            <Badge variant="default" className="bg-green-600">
                              <Check className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Complete</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Incomplete</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{attendee.ticket_type?.name || '-'}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Name"
                              className="h-8 min-w-[100px]"
                            />
                          ) : (
                            <div>
                              <span className={!attendee.attendee_name ? 'text-muted-foreground italic' : ''}>
                                {attendee.attendee_name || 'Not provided'}
                              </span>
                              {/* Mobile-only: show ticket type */}
                              <div className="sm:hidden text-xs text-muted-foreground">
                                {attendee.ticket_type?.name || ''}
                              </div>
                              {/* Mobile/tablet: show email */}
                              <div className="md:hidden text-xs text-muted-foreground truncate">
                                {attendee.attendee_email || ''}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {isEditing ? (
                            <Input
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="Email"
                              type="email"
                              className="h-8 min-w-[120px]"
                            />
                          ) : (
                            <span className={`truncate block max-w-[150px] ${!attendee.attendee_email ? 'text-muted-foreground italic' : ''}`}>
                              {attendee.attendee_email || 'Not provided'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={saveEdit}
                                disabled={updateAttendee.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(attendee)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
