import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface ActivityLog {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id: string;
  entity_title: string | null;
  user_id: string | null;
  user_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UseActivityLogsOptions {
  entityType?: string;
  action?: string;
  limit?: number;
}

export function useActivityLogs(options: UseActivityLogsOptions = {}) {
  const { entityType, action, limit = 50 } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['activity-logs', entityType, action, limit],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entityType && entityType !== 'all') {
        queryBuilder = queryBuilder.eq('entity_type', entityType);
      }

      if (action && action !== 'all') {
        queryBuilder = queryBuilder.eq('action', action);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('activity-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
        },
        (payload) => {
          // Prepend new log to the existing data
          queryClient.setQueryData<ActivityLog[]>(
            ['activity-logs', entityType, action, limit],
            (old) => {
              if (!old) return [payload.new as ActivityLog];
              const newLogs = [payload.new as ActivityLog, ...old];
              return newLogs.slice(0, limit);
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, entityType, action, limit]);

  return query;
}
