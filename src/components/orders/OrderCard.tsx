import { useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PortalOrder } from '@/hooks/useOrderPortal';
import { AttendeeList } from './AttendeeList';
import { 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  MapPin, 
  Ticket, 
  Users,
  Smartphone
} from 'lucide-react';

interface OrderCardProps {
  order: PortalOrder;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-500',
  pending: 'bg-yellow-500',
  cancelled: 'bg-red-500',
  refunded: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  completed: 'Completed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export function OrderCard({ order }: OrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const progressPercent = order.attendee_stats.total > 0 
    ? (order.attendee_stats.registered / order.attendee_stats.total) * 100 
    : 0;

  const ticketSummary = order.order_items
    .map(item => `${item.quantity}x ${item.ticket_type?.name || 'Ticket'}`)
    .join(', ');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{order.event?.title || 'Event'}</CardTitle>
                  <Badge 
                    variant="secondary" 
                    className={`${statusColors[order.status]} text-white`}
                  >
                    {statusLabels[order.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Order #{order.order_number} • {format(new Date(order.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-3">
              {order.event?.starts_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(order.event.starts_at), 'MMM d, yyyy • h:mm a')}
                </div>
              )}
              {order.event?.venue_name && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {order.event.venue_name}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Ticket className="h-4 w-4" />
                {ticketSummary}
              </div>
            </div>

            {/* Event App Link */}
            {order.status === 'completed' && (
              <Link 
                to="/attendee/app/home" 
                className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Smartphone className="h-4 w-4" />
                Open Event App →
              </Link>
            )}

            {/* Attendee Progress */}
            {order.status === 'completed' && order.attendee_stats.total > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Attendees Registered
                  </span>
                  <span className="text-muted-foreground">
                    {order.attendee_stats.registered}/{order.attendee_stats.total}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            <Separator />

            {/* Attendees Section */}
            {order.status === 'completed' && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Attendee Information
                </h3>
                <AttendeeList 
                  attendees={order.attendees} 
                  orderItems={order.order_items}
                  purchaserEmail={order.email}
                />
              </div>
            )}

            {/* Order Details */}
            <div>
              <h3 className="font-medium mb-3">Order Summary</h3>
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.quantity}x {item.ticket_type?.name || 'Ticket'}</span>
                    <span>${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>${(order.total_cents / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
