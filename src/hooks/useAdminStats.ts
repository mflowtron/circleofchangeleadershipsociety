import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek } from 'date-fns';

export interface AdminStats {
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
  activeEvents: number;
  ordersToday: number;
  ordersThisWeek: number;
  postsToday: number;
  unreadMessages: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      const today = startOfDay(new Date()).toISOString();
      const weekStart = startOfWeek(new Date()).toISOString();

      // Fetch all counts in parallel
      const [
        usersResult,
        eventsResult,
        ordersTodayResult,
        ordersWeekResult,
        postsTodayResult,
        messagesResult,
      ] = await Promise.all([
        // Users count
        supabase
          .from('profiles')
          .select('is_approved', { count: 'exact' }),
        // Active events count
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true)
          .gte('starts_at', new Date().toISOString()),
        // Orders today
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today),
        // Orders this week
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekStart),
        // Posts today
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today),
        // Unread messages
        supabase
          .from('order_messages')
          .select('*', { count: 'exact', head: true })
          .is('read_at', null)
          .eq('sender_type', 'customer'),
      ]);

      // Calculate user stats from the full list
      const profiles = usersResult.data || [];
      const approvedUsers = profiles.filter(p => p.is_approved).length;
      const pendingUsers = profiles.filter(p => !p.is_approved).length;

      return {
        totalUsers: profiles.length,
        approvedUsers,
        pendingUsers,
        activeEvents: eventsResult.count || 0,
        ordersToday: ordersTodayResult.count || 0,
        ordersThisWeek: ordersWeekResult.count || 0,
        postsToday: postsTodayResult.count || 0,
        unreadMessages: messagesResult.count || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
