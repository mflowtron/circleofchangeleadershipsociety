import { useState } from 'react';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { ActivityItem } from './ActivityItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CircleLoader } from '@/components/ui/circle-loader';
import { Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ENTITY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'user', label: 'Users' },
  { value: 'post', label: 'Posts' },
  { value: 'comment', label: 'Comments' },
  { value: 'order', label: 'Orders' },
  { value: 'event', label: 'Events' },
  { value: 'recording', label: 'Recordings' },
  { value: 'announcement', label: 'Announcements' },
];

const ACTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
];

export function ActivityFeed() {
  const [entityType, setEntityType] = useState('all');
  const [action, setAction] = useState('all');
  
  const { data: logs, isLoading, refetch, isRefetching } = useActivityLogs({
    entityType,
    action,
    limit: 50,
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 mt-2">
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map(a => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-0 p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <CircleLoader size="sm" />
          </div>
        ) : logs && logs.length > 0 ? (
          <ScrollArea className="h-full px-4">
            <div className="space-y-1 pb-4">
              {logs.map(log => (
                <ActivityItem key={log.id} log={log} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Activity className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No activity logs yet</p>
            <p className="text-xs">Activities will appear here as they happen</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
