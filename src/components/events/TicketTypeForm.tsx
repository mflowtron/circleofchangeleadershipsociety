import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { TicketType, CreateTicketTypeData, UpdateTicketTypeData } from '@/hooks/useTicketTypes';

interface TicketTypeFormProps {
  eventId: string;
  ticketType?: TicketType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTicketTypeData | UpdateTicketTypeData) => Promise<void>;
  isSubmitting: boolean;
}

export function TicketTypeForm({
  eventId,
  ticketType,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: TicketTypeFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [quantityAvailable, setQuantityAvailable] = useState('');
  const [maxPerOrder, setMaxPerOrder] = useState('10');
  const [salesStartAt, setSalesStartAt] = useState('');
  const [salesEndAt, setSalesEndAt] = useState('');

  useEffect(() => {
    if (ticketType) {
      setName(ticketType.name);
      setDescription(ticketType.description || '');
      setPriceDollars((ticketType.price_cents / 100).toFixed(2));
      setQuantityAvailable(ticketType.quantity_available?.toString() || '');
      setMaxPerOrder(ticketType.max_per_order.toString());
      setSalesStartAt(
        ticketType.sales_start_at
          ? format(new Date(ticketType.sales_start_at), "yyyy-MM-dd'T'HH:mm")
          : ''
      );
      setSalesEndAt(
        ticketType.sales_end_at
          ? format(new Date(ticketType.sales_end_at), "yyyy-MM-dd'T'HH:mm")
          : ''
      );
    } else {
      setName('');
      setDescription('');
      setPriceDollars('');
      setQuantityAvailable('');
      setMaxPerOrder('10');
      setSalesStartAt('');
      setSalesEndAt('');
    }
  }, [ticketType, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceCents = Math.round(parseFloat(priceDollars || '0') * 100);

    const data: CreateTicketTypeData | UpdateTicketTypeData = {
      ...(ticketType && { id: ticketType.id }),
      ...(!ticketType && { event_id: eventId }),
      name,
      description: description || undefined,
      price_cents: priceCents,
      quantity_available: quantityAvailable ? parseInt(quantityAvailable) : undefined,
      max_per_order: parseInt(maxPerOrder) || 10,
      sales_start_at: salesStartAt ? new Date(salesStartAt).toISOString() : undefined,
      sales_end_at: salesEndAt ? new Date(salesEndAt).toISOString() : undefined,
    };

    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {ticketType ? 'Edit Ticket Type' : 'Add Ticket Type'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticketName">Name *</Label>
            <Input
              id="ticketName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="General Admission"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketDescription">Description</Label>
            <Textarea
              id="ticketDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included with this ticket..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticketPrice">Price ($) *</Label>
              <Input
                id="ticketPrice"
                type="number"
                min="0"
                step="0.01"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketQuantity">Quantity Available</Label>
              <Input
                id="ticketQuantity"
                type="number"
                min="0"
                value={quantityAvailable}
                onChange={(e) => setQuantityAvailable(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPerOrder">Max Per Order</Label>
            <Input
              id="maxPerOrder"
              type="number"
              min="1"
              value={maxPerOrder}
              onChange={(e) => setMaxPerOrder(e.target.value)}
              placeholder="10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesStart">Sales Start</Label>
              <Input
                id="salesStart"
                type="datetime-local"
                value={salesStartAt}
                onChange={(e) => setSalesStartAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesEnd">Sales End</Label>
              <Input
                id="salesEnd"
                type="datetime-local"
                value={salesEndAt}
                onChange={(e) => setSalesEndAt(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : ticketType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
