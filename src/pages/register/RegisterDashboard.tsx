import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pencil,
  Send,
  ShoppingCart,
  User,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RegistrationLayout } from '@/components/registration/RegistrationLayout';
import { AttendeeSlot } from '@/components/registration/AttendeeSlot';
import { useRegistration } from '@/hooks/useRegistration';
import { CircleLoader } from '@/components/ui/circle-loader';
import type { RegistrationOrder, RegistrationAttendee } from '@/types/registration';
import { toast } from 'sonner';

function OrderSection({ registration }: { registration: RegistrationOrder }) {
  const { updateAttendee, sendForms, session } = useRegistration();
  const { order, event, attendees, attendee_stats, order_items } = registration;

  const totalTickets = order_items.reduce((sum, item) => sum + item.quantity, 0);
  const formProgress =
    attendee_stats.total > 0
      ? Math.round((attendee_stats.forms_complete / attendee_stats.total) * 100)
      : 0;

  // Attendees eligible for form sending: has name+email, status is needs_info
  const sendableAttendees = attendees.filter(
    (a) =>
      a.attendee_name?.trim() &&
      a.attendee_email?.trim() &&
      a.form_status === 'needs_info'
  );

  // Attendees with pending forms
  const pendingAttendees = attendees.filter((a) => a.form_status === 'pending');

  // Check if purchaser has claimed a slot
  const purchaserClaimed = attendees.some((a) => a.is_purchaser);
  const hasEmptySlot = attendees.some(
    (a) => !a.attendee_name?.trim() || !a.attendee_email?.trim()
  );
  const showClaimOption =
    !purchaserClaimed && hasEmptySlot && order.purchaser_is_attending !== false;

  const handleSaveAttendee = async (
    attendeeId: string,
    data: { attendee_name: string; attendee_email: string }
  ) => {
    await updateAttendee.mutateAsync({
      attendee_id: attendeeId,
      ...data,
    });
  };

  const handleClaimSlot = async () => {
    // Find first empty slot
    const emptySlot = attendees.find(
      (a) => !a.attendee_name?.trim() || !a.attendee_email?.trim()
    );
    if (!emptySlot) return;

    await updateAttendee.mutateAsync({
      attendee_id: emptySlot.id,
      attendee_name: order.full_name,
      attendee_email: order.email,
      is_purchaser: true,
    });
  };

  const handleSendForms = async () => {
    const ids = sendableAttendees.map((a) => a.id);
    if (ids.length === 0) return;
    await sendForms.mutateAsync(ids);
  };

  const handleResendReminders = async () => {
    // For resending, we just re-send to pending attendees
    // The edge function will handle the status check
    const ids = pendingAttendees.map((a) => a.id);
    if (ids.length === 0) return;
    toast.info('Resend reminders is not yet implemented');
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      cents / 100
    );

  return (
    <div className="space-y-5">
      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif font-bold" style={{ color: '#2D0A18' }}>
            Order for {order.full_name}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm" style={{ color: '#8B6F5E' }}>
            {order.organization_name && <span>{order.organization_name}</span>}
            <span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <Badge
          className="self-start px-3 py-1 text-xs font-medium border-0"
          style={{ backgroundColor: '#2D8B55', color: '#FFFFFF' }}
        >
          Paid
        </Badge>
      </div>

      {/* Alert Banner */}
      {attendee_stats.total - attendee_stats.named > 0 && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ backgroundColor: '#FEF3E2', border: '1px solid #F5D799' }}
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: '#D4780A' }} />
          <p className="text-sm font-medium" style={{ color: '#92400E' }}>
            {attendee_stats.total - attendee_stats.named} attendee
            {attendee_stats.total - attendee_stats.named !== 1 ? 's' : ''} still need
            details
          </p>
        </div>
      )}

      {/* Progress Card */}
      <Card className="border" style={{ borderColor: '#e8ddd0' }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: '#2D0A18' }}>
              Registration Progress
            </span>
            <span className="text-sm" style={{ color: '#8B6F5E' }}>
              {attendee_stats.forms_complete}/{attendee_stats.total} forms completed
            </span>
          </div>
          <Progress value={formProgress} className="h-2" />
          <div className="flex flex-wrap gap-4 mt-3 text-xs" style={{ color: '#8B6F5E' }}>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#2D8B55' }} />
              {attendee_stats.forms_complete} complete
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" style={{ color: '#D4780A' }} />
              {attendee_stats.forms_sent} awaiting
            </span>
            <span className="flex items-center gap-1">
              <Pencil className="h-3.5 w-3.5" style={{ color: '#8B6F5E' }} />
              {attendee_stats.total - attendee_stats.named} need details
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Attendees Card */}
      <Card className="border" style={{ borderColor: '#e8ddd0' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base" style={{ color: '#2D0A18' }}>
              Attendees ({attendee_stats.total})
            </CardTitle>
            {showClaimOption && (
              <button
                onClick={handleClaimSlot}
                className="text-sm font-medium underline underline-offset-2"
                style={{ color: '#6B1D3A' }}
                disabled={updateAttendee.isPending}
              >
                I'm attending — use a ticket for me
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {attendees.map((attendee, idx) => (
            <AttendeeSlot
              key={attendee.id}
              attendee={attendee}
              index={idx}
              onSave={(data) => handleSaveAttendee(attendee.id, data)}
              disabled={updateAttendee.isPending}
            />
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {sendableAttendees.length > 0 && (
          <Button
            onClick={handleSendForms}
            disabled={sendForms.isPending}
            className="gap-2 rounded-xl font-semibold"
            style={{ backgroundColor: '#DFA51F', color: '#2D0A18' }}
          >
            {sendForms.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Registration Forms ({sendableAttendees.length} attendee
            {sendableAttendees.length !== 1 ? 's' : ''})
          </Button>
        )}
        {pendingAttendees.length > 0 && (
          <Button
            onClick={handleResendReminders}
            variant="outline"
            className="gap-2 rounded-xl"
            style={{ borderColor: '#6B1D3A', color: '#6B1D3A' }}
          >
            <Send className="h-4 w-4" />
            Resend Reminders
          </Button>
        )}
        <Button
          asChild
          variant="outline"
          className="gap-2 rounded-xl"
          style={{ borderColor: '#e8ddd0', color: '#6B1D3A' }}
        >
          <Link to="/events">
            <ShoppingCart className="h-4 w-4" />
            Purchase Additional Tickets
          </Link>
        </Button>
      </div>

      {/* Order Details Footer */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{ backgroundColor: '#f5f0ea', color: '#8B6F5E' }}
      >
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <span className="font-medium">{totalTickets} ticket{totalTickets !== 1 ? 's' : ''}</span>
            {order_items[0]?.ticket_type && (
              <span> · {order_items[0].ticket_type.name}</span>
            )}
          </div>
          <div>
            <span>Purchaser: {order.full_name}</span>
          </div>
          <div className="font-medium" style={{ color: '#2D0A18' }}>
            Total paid: {formatPrice(order.total_cents)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterDashboard() {
  const navigate = useNavigate();
  const { isVerified, email, clearSession, orders, ordersLoading, ordersError } =
    useRegistration();

  // Redirect if not verified
  useEffect(() => {
    if (!isVerified) {
      navigate('/register/verify', { replace: true });
    }
  }, [isVerified, navigate]);

  if (!isVerified) return null;

  const handleSignOut = () => {
    clearSession();
    navigate('/register/verify', { replace: true });
  };

  return (
    <RegistrationLayout>
      <div className="max-w-[720px] mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-serif font-bold" style={{ color: '#2D0A18' }}>
              My Registrations
            </h1>
            <p className="text-sm mt-1" style={{ color: '#8B6F5E' }}>
              {email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-2 text-sm"
            style={{ color: '#6B1D3A' }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Loading */}
        {ordersLoading && (
          <div className="flex items-center justify-center py-24">
            <CircleLoader size="md" />
          </div>
        )}

        {/* Error */}
        {ordersError && (
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <p className="text-destructive font-medium">
                {ordersError instanceof Error
                  ? ordersError.message
                  : 'Failed to load orders'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!ordersLoading && !ordersError && orders.length === 0 && (
          <Card className="border" style={{ borderColor: '#e8ddd0' }}>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 mx-auto mb-4" style={{ color: '#d4c5b9' }} />
              <h2 className="text-lg font-serif font-bold mb-2" style={{ color: '#2D0A18' }}>
                No Registrations Found
              </h2>
              <p className="text-sm mb-6" style={{ color: '#8B6F5E' }}>
                We couldn't find any completed orders for this email.
              </p>
              <Button
                asChild
                style={{ backgroundColor: '#DFA51F', color: '#2D0A18' }}
              >
                <Link to="/events">Browse Events</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Orders */}
        {!ordersLoading &&
          orders.map((registration) => (
            <div key={registration.order.id} className="mb-10">
              <OrderSection registration={registration} />
            </div>
          ))}
      </div>
    </RegistrationLayout>
  );
}
