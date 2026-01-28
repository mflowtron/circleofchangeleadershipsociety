import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrdersTable } from '@/components/events/OrdersTable';
import { useMultiEventOrders } from '@/hooks/useOrders';
import { useEventSelection } from '@/contexts/EventSelectionContext';
import { useEvents } from '@/hooks/useEvents';

export default function Orders() {
  const { selectedEventIds, hasSelection } = useEventSelection();
  const { events = [] } = useEvents();
  const { data: orders = [], isLoading } = useMultiEventOrders(
    hasSelection ? selectedEventIds : null
  );

  // Create event lookup map
  const eventMap = new Map<string, string>(events.map((e) => [e.id, e.title]));

  const handleExport = () => {
    const csvContent = [
      ['Order #', 'Event', 'Customer', 'Email', 'Phone', 'Status', 'Total', 'Date'].join(','),
      ...orders.map((order) => [
        order.order_number,
        `"${eventMap.get(order.event_id) || 'Unknown'}"`,
        `"${order.full_name}"`,
        order.email,
        order.phone || '',
        order.status,
        (order.total_cents / 100).toFixed(2),
        new Date(order.created_at).toISOString(),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            {hasSelection
              ? `Showing orders from ${selectedEventIds.length} selected event${selectedEventIds.length > 1 ? 's' : ''}`
              : 'Showing orders from all events'}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={orders.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <OrdersTable 
        orders={orders} 
        isLoading={isLoading} 
        eventMap={eventMap}
        showEventColumn
      />
    </div>
  );
}
