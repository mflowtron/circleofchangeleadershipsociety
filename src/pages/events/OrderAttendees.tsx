import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Users, Check, Save, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { EventsLayout } from '@/layouts/EventsLayout';
import { useEvent } from '@/hooks/useEvents';
import { useOrderAttendees, useBulkUpdateAttendees, Attendee } from '@/hooks/useAttendees';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderDetails {
  id: string;
  order_number: string;
  full_name: string;
  email: string;
  created_at: string;
  event_id: string;
}

export default function OrderAttendees() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { data: event, isLoading: isLoadingEvent } = useEvent(slug || '');
  const { data: attendees, isLoading: isLoadingAttendees } = useOrderAttendees(orderId);
  const bulkUpdate = useBulkUpdateAttendees();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [formData, setFormData] = useState<Record<string, { name: string; email: string }>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Verify access via token or user authentication
  useEffect(() => {
    const verifyAccess = async () => {
      if (!orderId) {
        setIsLoadingOrder(false);
        return;
      }

      try {
        // First, try to get the order (will work if user owns it or is admin)
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, order_number, full_name, email, created_at, event_id')
          .eq('id', orderId)
          .single();

        if (!orderError && orderData) {
          setOrder(orderData);
          setIsAuthorized(true);
          setIsLoadingOrder(false);
          return;
        }

        // If that failed and we have a token, verify via RPC
        if (token) {
          const { data: isValid } = await supabase.rpc('verify_order_edit_token', {
            p_order_id: orderId,
            p_token: token,
          });

          if (isValid) {
            // Fetch order details via edge function or public data
            // For now, we allow access based on token
            setIsAuthorized(true);
            // We need to get order info some other way for guest users
            // For simplicity, just set basic info from attendees query
          }
        }
      } catch (error) {
        console.error('Error verifying access:', error);
      } finally {
        setIsLoadingOrder(false);
      }
    };

    verifyAccess();
  }, [orderId, token]);

  // Initialize form data when attendees load
  useEffect(() => {
    if (attendees) {
      const initial: Record<string, { name: string; email: string }> = {};
      attendees.forEach((a) => {
        initial[a.id] = {
          name: a.attendee_name || '',
          email: a.attendee_email || '',
        };
      });
      setFormData(initial);
    }
  }, [attendees]);

  const updateField = (
    attendeeId: string,
    field: 'name' | 'email',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [attendeeId]: {
        ...prev[attendeeId],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const updates = Object.entries(formData).map(([id, data]) => ({
      id,
      attendee_name: data.name || null,
      attendee_email: data.email || null,
    }));

    try {
      await bulkUpdate.mutateAsync(updates);
      toast.success('Attendee information saved');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save attendee information');
    }
  };

  const isLoading = isLoadingEvent || isLoadingOrder || isLoadingAttendees;

  if (isLoading) {
    return (
      <EventsLayout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading attendee information...</p>
        </div>
      </EventsLayout>
    );
  }

  if (!isAuthorized || !attendees) {
    return (
      <EventsLayout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to view this page. Please use the link from your confirmation email.
          </p>
          <Button asChild>
            <Link to="/events">Browse Events</Link>
          </Button>
        </div>
      </EventsLayout>
    );
  }

  const completedCount = attendees.filter(
    (a) => formData[a.id]?.name && formData[a.id]?.email
  ).length;
  const totalCount = attendees.length;

  // Group attendees by ticket type
  const groupedAttendees = attendees.reduce((acc, attendee) => {
    const typeName = attendee.ticket_type?.name || 'Ticket';
    if (!acc[typeName]) {
      acc[typeName] = [];
    }
    acc[typeName].push(attendee);
    return acc;
  }, {} as Record<string, Attendee[]>);

  return (
    <EventsLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to={`/events/${slug}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Link>
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Attendee Information</h1>
              {event && (
                <p className="text-muted-foreground">{event.title}</p>
              )}
              {order && (
                <p className="text-sm text-muted-foreground mt-1">
                  Order #{order.order_number} · {format(new Date(order.created_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <Badge variant={completedCount === totalCount ? 'default' : 'secondary'}>
              {completedCount}/{totalCount} Complete
            </Badge>
          </div>
        </div>

        {/* Instructions */}
        <Alert className="mb-6">
          <Users className="h-4 w-4" />
          <AlertDescription>
            Please provide the name and email for each attendee. This information will be used 
            to send them important event updates and registration forms.
          </AlertDescription>
        </Alert>

        {/* Attendee Forms */}
        <div className="space-y-6">
          {Object.entries(groupedAttendees).map(([ticketType, typeAttendees]) => (
            <Card key={ticketType}>
              <CardHeader>
                <CardTitle className="text-lg">{ticketType}</CardTitle>
                <CardDescription>
                  {typeAttendees.length} {typeAttendees.length === 1 ? 'attendee' : 'attendees'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {typeAttendees.map((attendee, index) => {
                  const data = formData[attendee.id] || { name: '', email: '' };
                  const isComplete = data.name && data.email;

                  return (
                    <div key={attendee.id}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium">Attendee {index + 1}</span>
                        {isComplete && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${attendee.id}`}>Full Name</Label>
                          <Input
                            id={`name-${attendee.id}`}
                            value={data.name}
                            onChange={(e) => updateField(attendee.id, 'name', e.target.value)}
                            placeholder="Enter full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`email-${attendee.id}`}>Email Address</Label>
                          <Input
                            id={`email-${attendee.id}`}
                            type="email"
                            value={data.email}
                            onChange={(e) => updateField(attendee.id, 'email', e.target.value)}
                            placeholder="Enter email address"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end sticky bottom-4">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={!hasChanges || bulkUpdate.isPending}
          >
            {bulkUpdate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </EventsLayout>
  );
}
