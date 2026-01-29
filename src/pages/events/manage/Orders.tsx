import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrdersTable } from '@/components/events/OrdersTable';
import { useMultiEventOrders } from '@/hooks/useOrders';
import { useEventSelection } from '@/contexts/EventSelectionContext';
import { useEvents } from '@/hooks/useEvents';

export default function Orders() {
  const { selectedEventId, hasSelection } = useEventSelection();
  const { events = [] } = useEvents();
  const { data: orders = [], isLoading } = useMultiEventOrders(
    hasSelection ? [selectedEventId!] : null
  );

  // Create event lookup map
  const eventMap = new Map<string, string>(events.map((e) => [e.id, e.title]));

  const selectedEventName = selectedEventId ? eventMap.get(selectedEventId) : null;

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground truncate">
            {hasSelection
              ? `Showing orders for ${selectedEventName}`
              : 'Showing orders from all events'}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={orders.length === 0} className="w-full sm:w-auto">
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      <OrdersTable 
        orders={orders} 
        isLoading={isLoading} 
        eventMap={eventMap}
        showEventColumn={!hasSelection}
      />
    </div>
  );
}
