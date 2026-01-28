import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TicketType } from '@/hooks/useTicketTypes';

interface TicketSelectorProps {
  ticketTypes: TicketType[];
  selectedTickets: Record<string, number>;
  onSelectionChange: (selection: Record<string, number>) => void;
}

export function TicketSelector({
  ticketTypes,
  selectedTickets,
  onSelectionChange,
}: TicketSelectorProps) {
  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const isTicketAvailable = (ticket: TicketType) => {
    const now = new Date();
    if (ticket.sales_start_at && new Date(ticket.sales_start_at) > now) return false;
    if (ticket.sales_end_at && new Date(ticket.sales_end_at) < now) return false;
    if (ticket.quantity_available !== null && ticket.quantity_sold >= ticket.quantity_available) return false;
    return true;
  };

  const getAvailableQuantity = (ticket: TicketType) => {
    if (ticket.quantity_available === null) return ticket.max_per_order;
    const remaining = ticket.quantity_available - ticket.quantity_sold;
    return Math.min(remaining, ticket.max_per_order);
  };

  const updateQuantity = (ticketId: string, delta: number) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    if (!ticket) return;

    const currentQty = selectedTickets[ticketId] || 0;
    const maxQty = getAvailableQuantity(ticket);
    const newQty = Math.max(0, Math.min(maxQty, currentQty + delta));

    const newSelection = { ...selectedTickets };
    if (newQty === 0) {
      delete newSelection[ticketId];
    } else {
      newSelection[ticketId] = newQty;
    }
    onSelectionChange(newSelection);
  };

  const totalAmount = Object.entries(selectedTickets).reduce((sum, [ticketId, qty]) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    return sum + (ticket ? ticket.price_cents * qty : 0);
  }, 0);

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="space-y-4">
      {ticketTypes.map((ticket) => {
        const available = isTicketAvailable(ticket);
        const maxQty = getAvailableQuantity(ticket);
        const currentQty = selectedTickets[ticket.id] || 0;
        const remaining = ticket.quantity_available !== null
          ? ticket.quantity_available - ticket.quantity_sold
          : null;

        return (
          <div
            key={ticket.id}
            className={`p-4 rounded-lg border transition-colors ${
              currentQty > 0 ? 'border-primary bg-primary/5' : 'bg-card'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{ticket.name}</h3>
                  {!available && (
                    <Badge variant="secondary">
                      {remaining === 0 ? 'Sold Out' : 'Unavailable'}
                    </Badge>
                  )}
                  {remaining !== null && remaining > 0 && remaining <= 10 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      {remaining} left
                    </Badge>
                  )}
                </div>
                {ticket.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {ticket.description}
                  </p>
                )}
                <div className="text-lg font-semibold">
                  {formatPrice(ticket.price_cents)}
                </div>
              </div>

              {available && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(ticket.id, -1)}
                    disabled={currentQty === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{currentQty}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(ticket.id, 1)}
                    disabled={currentQty >= maxQty}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Summary */}
      {totalTickets > 0 && (
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">
              {totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'}
            </span>
            <span className="text-xl font-bold">
              {formatPrice(totalAmount)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
