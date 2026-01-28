import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  quantity_available: number | null;
  quantity_sold: number;
  sales_start_at: string | null;
  sales_end_at: string | null;
  max_per_order: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketTypeData {
  event_id: string;
  name: string;
  description?: string;
  price_cents: number;
  quantity_available?: number;
  sales_start_at?: string;
  sales_end_at?: string;
  max_per_order?: number;
  sort_order?: number;
}

export interface UpdateTicketTypeData extends Partial<Omit<CreateTicketTypeData, 'event_id'>> {
  id: string;
}

export function useTicketTypes(eventId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const ticketTypesQuery = useQuery({
    queryKey: ['ticket_types', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as TicketType[];
    },
    enabled: !!eventId,
  });

  const createTicketTypeMutation = useMutation({
    mutationFn: async (ticketData: CreateTicketTypeData) => {
      const { data, error } = await supabase
        .from('ticket_types')
        .insert(ticketData)
        .select()
        .single();

      if (error) throw error;
      return data as TicketType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_types', eventId] });
      toast({
        title: 'Ticket type created',
        description: 'The ticket type has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating ticket type',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateTicketTypeMutation = useMutation({
    mutationFn: async ({ id, ...ticketData }: UpdateTicketTypeData) => {
      const { data, error } = await supabase
        .from('ticket_types')
        .update(ticketData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TicketType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_types', eventId] });
      toast({
        title: 'Ticket type updated',
        description: 'The ticket type has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating ticket type',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTicketTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_types', eventId] });
      toast({
        title: 'Ticket type deleted',
        description: 'The ticket type has been deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting ticket type',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    ticketTypes: ticketTypesQuery.data ?? [],
    isLoading: ticketTypesQuery.isLoading,
    createTicketType: createTicketTypeMutation.mutateAsync,
    updateTicketType: updateTicketTypeMutation.mutateAsync,
    deleteTicketType: deleteTicketTypeMutation.mutateAsync,
    isCreating: createTicketTypeMutation.isPending,
    isUpdating: updateTicketTypeMutation.isPending,
    isDeleting: deleteTicketTypeMutation.isPending,
  };
}
