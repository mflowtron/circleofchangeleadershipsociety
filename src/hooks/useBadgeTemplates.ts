import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  created_at: string;
  updated_at: string;
}

export function useBadgeTemplate(eventId: string | null) {
  return useQuery({
    queryKey: ['badge-template', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      const { data, error } = await supabase
        .from('badge_templates')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        return {
          ...data,
          fields: (data.fields as unknown as BadgeField[]) || [],
          orientation: ((data as any).orientation as BadgeOrientation) || 'landscape',
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
      const insertData = {
        event_id: eventId,
        fields: JSON.parse(JSON.stringify(fields)),
        background_image_url: backgroundImageUrl || null,
        orientation,
      };
      
      const { data, error } = await supabase
        .from('badge_templates')
        .insert(insertData as any)
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
      const updates: Record<string, unknown> = {};
      if (fields !== undefined) updates.fields = JSON.parse(JSON.stringify(fields));
      if (backgroundImageUrl !== undefined) updates.background_image_url = backgroundImageUrl;
      if (orientation !== undefined) updates.orientation = orientation;
      
      const { data, error } = await supabase
        .from('badge_templates')
        .update(updates)
        .eq('id', id)
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
