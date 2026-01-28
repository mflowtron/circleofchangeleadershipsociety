import { useState } from 'react';
import { format } from 'date-fns';
import { Search, ChevronDown, ChevronUp, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { OrderWithItems } from '@/hooks/useOrders';

interface OrdersTableProps {
  orders: OrderWithItems[];
  isLoading?: boolean;
  eventMap?: Map<string, string>;
  showEventColumn?: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
  refunded: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export function OrdersTable({ orders, isLoading, eventMap, showEventColumn }: OrdersTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getTotalTickets = (order: OrderWithItems) => {
    return order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border animate-pulse">
        <div className="h-64 bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order #, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredOrders.length} of {orders.length} orders
      </p>

      {/* Table */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 rounded-lg border bg-card">
          <p className="text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Order</TableHead>
                {showEventColumn && <TableHead>Event</TableHead>}
                <TableHead>Customer</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <Collapsible key={order.id} asChild>
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleExpanded(order.id)}
                          >
                            {expandedOrders.has(order.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{order.order_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </TableCell>
                      {showEventColumn && (
                        <TableCell>
                          <span className="text-sm truncate max-w-[200px] block">
                            {eventMap?.get(order.event_id) || 'Unknown'}
                          </span>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="font-medium">{order.full_name}</div>
                        <div className="text-sm text-muted-foreground">{order.email}</div>
                      </TableCell>
                      <TableCell>{getTotalTickets(order)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[order.status]}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.total_cents)}
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={showEventColumn ? 7 : 6} className="p-4">
                          <div className="space-y-4">
                            {/* Contact Info */}
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a
                                  href={`mailto:${order.email}`}
                                  className="text-primary hover:underline"
                                >
                                  {order.email}
                                </a>
                              </div>
                              {order.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <a
                                    href={`tel:${order.phone}`}
                                    className="text-primary hover:underline"
                                  >
                                    {order.phone}
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Order Items */}
                            <div>
                              <h4 className="font-medium mb-2">Tickets</h4>
                              <div className="rounded-lg border bg-card">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Ticket Type</TableHead>
                                      <TableHead>Attendee</TableHead>
                                      <TableHead className="text-center">Qty</TableHead>
                                      <TableHead className="text-right">Price</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {order.order_items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>
                                          {item.ticket_type?.name || 'Unknown'}
                                        </TableCell>
                                        <TableCell>
                                          {item.attendee_name || item.attendee_email || '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {item.quantity}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {formatCurrency(item.unit_price_cents * item.quantity)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            {/* Summary */}
                            <div className="flex justify-end">
                              <div className="text-right space-y-1 text-sm">
                                <div className="flex justify-between gap-8">
                                  <span className="text-muted-foreground">Subtotal:</span>
                                  <span>{formatCurrency(order.subtotal_cents)}</span>
                                </div>
                                {order.fees_cents > 0 && (
                                  <div className="flex justify-between gap-8">
                                    <span className="text-muted-foreground">Fees:</span>
                                    <span>{formatCurrency(order.fees_cents)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between gap-8 font-medium text-base pt-1 border-t">
                                  <span>Total:</span>
                                  <span>{formatCurrency(order.total_cents)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
