import { StatsCards } from '@/components/admin/StatsCards';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { CommunicationLogs } from '@/components/admin/CommunicationLogs';
import { RecentUsers } from '@/components/admin/RecentUsers';
import { Activity } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Activity Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time overview of platform activity
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>

        {/* Sidebar - Communication & Users */}
        <div className="space-y-6">
          <CommunicationLogs />
          <RecentUsers />
        </div>
      </div>
    </div>
  );
}
