import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemHealthMetrics {
  dbResponseTimeAvg: number;
  dbErrorCount: number;
  dbWarningCount: number;
  edgeFnAvgTime: number;
  edgeFnCallCount: number;
  edgeFnErrorCount: number;
  recentErrors: Array<{
    timestamp: string;
    severity: string;
    message: string;
  }>;
  lastUpdated: string;
}

async function fetchSystemHealth(): Promise<SystemHealthMetrics> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await supabase.functions.invoke('get-system-health', {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to fetch system health');
  }

  return response.data as SystemHealthMetrics;
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: fetchSystemHealth,
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 2,
  });
}
