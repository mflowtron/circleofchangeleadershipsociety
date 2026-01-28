import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Phone, Check, X, Pencil, MessageSquare, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrder } from '@/hooks/useOrders';
import { useOrderAttendees, useUpdateAttendee, Attendee } from '@/hooks/useAttendees';
import { useOrderMessages, useCreateOrderMessage } from '@/hooks/useOrderMessages';
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
  const { data: messages = [], isLoading: messagesLoading } = useOrderMessages(orderId);
  const createMessage = useCreateOrderMessage();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Message form state
  const [newMessage, setNewMessage] = useState('');
  const [isImportant, setIsImportant] = useState(false);

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

  const handleSendMessage = async () => {
    if (!orderId || !newMessage.trim()) return;
    
    try {
      await createMessage.mutateAsync({
        orderId,
        message: newMessage.trim(),
        isImportant,
      });
      toast.success('Message sent to customer');
      setNewMessage('');
      setIsImportant(false);
    } catch (error) {
      toast.error('Failed to send message');
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
      <div className="flex items-center gap-4">
        <Link to="/events/manage/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-mono">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), 'MMMM d, yyyy at h:mm a')}
          </p>
        </div>
        <Badge variant="outline" className={statusColors[order.status]}>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Attendees</CardTitle>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total:</span>
                <Badge variant="secondary">{attendees.length}</Badge>
      </div>

      {/* Messages Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Customer Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Message Composer */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <Label htmlFor="message">Send a message to the customer</Label>
            <Textarea
              id="message"
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="important"
                  checked={isImportant}
                  onCheckedChange={(checked) => setIsImportant(checked === true)}
                />
                <Label htmlFor="important" className="text-sm cursor-pointer">
                  Mark as important
                </Label>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || createMessage.isPending}
              >
                {createMessage.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Message
              </Button>
            </div>
          </div>

          {/* Message History */}
          {messagesLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : messages.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No messages sent yet
            </p>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Message History</h4>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg border ${
                    msg.is_important 
                      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500' 
                      : 'bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {msg.is_important && (
                        <div className="flex items-center gap-1 text-yellow-600 text-xs mb-1">
                          <AlertTriangle className="h-3 w-3" />
                          Important
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                      <p>{format(new Date(msg.created_at), 'MMM d, h:mm a')}</p>
                      {msg.read_at ? (
                        <p className="text-green-600 flex items-center gap-1 justify-end">
                          <Check className="h-3 w-3" />
                          Read
                        </p>
                      ) : (
                        <p>Unread</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Complete:</span>
                <Badge variant="default" className="bg-green-600">
                  {completeCount}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Incomplete:</span>
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
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Ticket Type</TableHead>
                    <TableHead>Attendee Name</TableHead>
                    <TableHead>Attendee Email</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
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
                              <Check className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              Incomplete
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{attendee.ticket_type?.name || '-'}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Name"
                              className="h-8"
                            />
                          ) : (
                            <span className={!attendee.attendee_name ? 'text-muted-foreground italic' : ''}>
                              {attendee.attendee_name || 'Not provided'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="Email"
                              type="email"
                              className="h-8"
                            />
                          ) : (
                            <span className={!attendee.attendee_email ? 'text-muted-foreground italic' : ''}>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
