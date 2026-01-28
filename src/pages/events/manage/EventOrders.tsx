import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, ShoppingCart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventStats } from '@/components/events/EventStats';
import { OrdersTable } from '@/components/events/OrdersTable';
import { AttendeesTable } from '@/components/events/AttendeesTable';
import { useEventById } from '@/hooks/useEvents';
import { useEventOrders, useEventOrderStats } from '@/hooks/useOrders';
import { useTicketTypes } from '@/hooks/useTicketTypes';
import { useEventAttendees } from '@/hooks/useAttendees';

export default function EventOrders() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading: isLoadingEvent } = useEventById(id || '');
  const { data: orders, isLoading: isLoadingOrders } = useEventOrders(id || '');
  const { data: stats, isLoading: isLoadingStats } = useEventOrderStats(id || '');
  const { ticketTypes, isLoading: isLoadingTickets } = useTicketTypes(id || '');
  const { data: attendees, isLoading: isLoadingAttendees } = useEventAttendees(id);

  const exportOrders = () => {
    if (!orders || !event) return;

    const completedOrders = orders.filter(o => o.status === 'completed');
    const rows = [['Order #', 'Name', 'Email', 'Phone', 'Ticket Type', 'Quantity', 'Total']];

    completedOrders.forEach(order => {
      order.order_items.forEach(item => {
        rows.push([
          order.order_number,
          order.full_name,
          order.email,
          order.phone || '',
          item.ticket_type?.name || 'Unknown',
          item.quantity.toString(),
          (order.total_cents / 100).toFixed(2),
        ]);
      });
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.slug}-orders.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAttendees = () => {
    if (!attendees || !event) return;

    const rows = [['Attendee Name', 'Attendee Email', 'Ticket Type', 'Order #', 'Purchaser Name', 'Purchaser Email', 'Status']];

    attendees.forEach(attendee => {
      rows.push([
        attendee.attendee_name || '',
        attendee.attendee_email || '',
        attendee.ticket_type?.name || 'Unknown',
        attendee.order?.order_number || '',
        attendee.order?.full_name || '',
        attendee.order?.email || '',
        attendee.attendee_name && attendee.attendee_email ? 'Complete' : 'Incomplete',
      ]);
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.slug}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoadingEvent) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded" />
          ))}
        </div>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/events/manage">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Orders & Attendees</h1>
            <p className="text-muted-foreground">{event.title}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <EventStats
        totalOrders={stats?.totalOrders ?? 0}
        completedOrders={stats?.completedOrders ?? 0}
        pendingOrders={stats?.pendingOrders ?? 0}
        totalRevenue={stats?.totalRevenue ?? 0}
        isLoading={isLoadingStats}
      />

      {/* Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">All Orders</TabsTrigger>
          <TabsTrigger value="attendees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Attendees
          </TabsTrigger>
          <TabsTrigger value="tickets">Ticket Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" onClick={exportOrders} disabled={!orders?.length}>
              <Download className="h-4 w-4 mr-2" />
              Export Orders
            </Button>
          </div>
          {!orders?.length && !isLoadingOrders ? (
            <div className="text-center py-16 rounded-lg border bg-card">
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
              <p className="text-muted-foreground">
                Orders will appear here when attendees purchase tickets
              </p>
            </div>
          ) : (
            <OrdersTable orders={orders || []} isLoading={isLoadingOrders} />
          )}
        </TabsContent>

        <TabsContent value="attendees">
          {!attendees?.length && !isLoadingAttendees ? (
            <div className="text-center py-16 rounded-lg border bg-card">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No attendees yet</h2>
              <p className="text-muted-foreground">
                Attendee records will be created when orders are completed
              </p>
            </div>
          ) : (
            <AttendeesTable 
              attendees={attendees || []} 
              isLoading={isLoadingAttendees}
              ticketTypes={ticketTypes.map(t => ({ id: t.id, name: t.name }))}
              onExport={exportAttendees}
            />
          )}
        </TabsContent>

        <TabsContent value="tickets">
          {isLoadingTickets ? (
            <div className="rounded-lg border animate-pulse">
              <div className="h-48 bg-muted" />
            </div>
          ) : ticketTypes.length === 0 ? (
            <div className="text-center py-12 rounded-lg border bg-card">
              <p className="text-muted-foreground">No ticket types configured</p>
              <Button asChild className="mt-4">
                <Link to={`/events/manage/${id}/tickets`}>Add Ticket Types</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {ticketTypes.map((ticket) => {
                const percentSold = ticket.quantity_available
                  ? Math.round((ticket.quantity_sold / ticket.quantity_available) * 100)
                  : 0;
                const revenue = ticket.quantity_sold * ticket.price_cents;

                return (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-lg border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-medium">{ticket.name}</h3>
                      {ticket.description && (
                        <p className="text-sm text-muted-foreground">{ticket.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{ticket.quantity_sold}</div>
                        <div className="text-muted-foreground">Sold</div>
                      </div>
                      {ticket.quantity_available && (
                        <>
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {ticket.quantity_available - ticket.quantity_sold}
                            </div>
                            <div className="text-muted-foreground">Remaining</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{percentSold}%</div>
                            <div className="text-muted-foreground">Sold</div>
                          </div>
                        </>
                      )}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          ${(revenue / 100).toFixed(0)}
                        </div>
                        <div className="text-muted-foreground">Revenue</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
