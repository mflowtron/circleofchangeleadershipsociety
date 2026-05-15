import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface BadgeField {
  id: string;
  label: string;
  x: number; // inches from left
  y: number; // inches from top
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  align: 'left' | 'center' | 'right';
  source: 'attendee_name' | 'attendee_email' | 'ticket_type' | 'order_number' | 'purchaser_name' | 'event_name' | 'event_date';
}

export type BadgeOrientation = 'portrait' | 'landscape';

export interface BadgeTemplate {
  id: string;
  event_id: string;
  background_image_url: string | null;
  fields: BadgeField[];
  orientation: BadgeOrientation;
}

// Badge templates are now stored in the events.badge_template JSONB column
export function useBadgeTemplate(eventId: string | null) {
  return useQuery({
    queryKey: ['badge-template', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      const { data, error } = await supabase
        .from('events')
        .select('id, badge_template')
        .eq('id', eventId)
        .single();
      
      if (error) throw error;
      
      if (data?.badge_template) {
        const template = data.badge_template as {
          background_image_url?: string | null;
          fields?: BadgeField[];
          orientation?: BadgeOrientation;
        };
        return {
          id: data.id, // Use event ID as template ID
          event_id: data.id,
          background_image_url: template.background_image_url || null,
          fields: template.fields || [],
          orientation: template.orientation || 'landscape',
        } as BadgeTemplate;
      }
      
      return null;
    },
    enabled: !!eventId,
  });
}

export function useCreateBadgeTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, fields, backgroundImageUrl, orientation = 'landscape' }: {
      eventId: string;
      fields: BadgeField[];
      backgroundImageUrl?: string | null;
      orientation?: BadgeOrientation;
    }) => {
      const badgeTemplate = {
        background_image_url: backgroundImageUrl || null,
        fields: JSON.parse(JSON.stringify(fields)),
        orientation,
      };
      
      const { data, error } = await supabase
        .from('events')
        .update({ badge_template: badgeTemplate as unknown as Json })
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['badge-template', variables.eventId] });
    },
  });
}

export function useUpdateBadgeTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, eventId, fields, backgroundImageUrl, orientation }: {
      id: string;
      eventId: string;
      fields?: BadgeField[];
      backgroundImageUrl?: string | null;
      orientation?: BadgeOrientation;
    }) => {
      // First get current badge_template
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('badge_template')
        .eq('id', eventId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentTemplate = (currentEvent?.badge_template as {
        background_image_url?: string | null;
        fields?: BadgeField[];
        orientation?: BadgeOrientation;
      }) || {};
      
      const updatedTemplate = {
        ...currentTemplate,
        ...(fields !== undefined && { fields: JSON.parse(JSON.stringify(fields)) }),
        ...(backgroundImageUrl !== undefined && { background_image_url: backgroundImageUrl }),
        ...(orientation !== undefined && { orientation }),
      };
      
      const { data, error } = await supabase
        .from('events')
        .update({ badge_template: updatedTemplate as unknown as Json })
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['badge-template', variables.eventId] });
    },
  });
}

export function useUploadBadgeBackground() {
  return useMutation({
    mutationFn: async ({ eventId, file }: { eventId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('badge-templates')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('badge-templates')
        .getPublicUrl(filePath);
      
      return publicUrl;
    },
  });
}
