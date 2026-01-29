import { useAdminStats } from '@/hooks/useAdminStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, ShoppingCart, FileText, Clock, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: typeof Users;
  isLoading?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Users"
        value={stats?.totalUsers || 0}
        subtitle={`${stats?.approvedUsers || 0} approved, ${stats?.pendingUsers || 0} pending`}
        icon={Users}
        isLoading={isLoading}
      />
      <StatCard
        title="Active Events"
        value={stats?.activeEvents || 0}
        subtitle="Published & upcoming"
        icon={Calendar}
        isLoading={isLoading}
      />
      <StatCard
        title="Orders"
        value={stats?.ordersToday || 0}
        subtitle={`${stats?.ordersThisWeek || 0} this week`}
        icon={ShoppingCart}
        isLoading={isLoading}
      />
      <StatCard
        title="Posts Today"
        value={stats?.postsToday || 0}
        subtitle="New content"
        icon={FileText}
        isLoading={isLoading}
      />
      <StatCard
        title="Pending Approvals"
        value={stats?.pendingUsers || 0}
        subtitle="Users awaiting approval"
        icon={Clock}
        isLoading={isLoading}
      />
      <StatCard
        title="Unread Messages"
        value={stats?.unreadMessages || 0}
        subtitle="Customer messages"
        icon={MessageSquare}
        isLoading={isLoading}
      />
    </div>
  );
}
