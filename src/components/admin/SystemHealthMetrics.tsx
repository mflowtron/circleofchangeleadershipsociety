import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { HealthGauge } from './HealthGauge';
import { Activity, Database, Zap, AlertTriangle, ChevronDown, RefreshCw, Cpu, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useState } from 'react';

export function SystemHealthMetrics() {
  const { data, isLoading, error, refetch, isFetching } = useSystemHealth();
  const [errorsOpen, setErrorsOpen] = useState(false);

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Failed to load health metrics</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Health
          </CardTitle>
          <div className="flex items-center gap-2">
            {data?.lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {format(new Date(data.lastUpdated), 'HH:mm:ss')}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <>
            {/* Gauges Grid - Responsive layout */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* CPU Usage */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Cpu className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-xs font-medium text-muted-foreground">CPU</span>
                </div>
                <HealthGauge
                  value={data?.cpuUsage || 0}
                  maxValue={100}
                  label="Usage"
                  unit="%"
                  thresholds={{ good: 50, warning: 80 }}
                  size="xs"
                />
              </div>

              {/* Memory Usage */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <HardDrive className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-xs font-medium text-muted-foreground">Memory</span>
                </div>
                <HealthGauge
                  value={data?.memoryUsage || 0}
                  maxValue={100}
                  label="Usage"
                  unit="%"
                  thresholds={{ good: 60, warning: 85 }}
                  size="xs"
                />
              </div>

              {/* Database Health */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Database className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-xs font-medium text-muted-foreground">Database</span>
                </div>
                <HealthGauge
                  value={data?.dbResponseTimeAvg || 0}
                  maxValue={1000}
                  label="Response"
                  unit="ms"
                  thresholds={{ good: 100, warning: 500 }}
                  size="xs"
                />
                <div className="flex flex-wrap gap-1 mt-1.5 justify-center">
                  {(data?.dbErrorCount || 0) > 0 ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {data?.dbErrorCount} errors
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-chart-2/10 text-chart-2 border-chart-2/30">
                      Healthy
                    </Badge>
                  )}
                </div>
              </div>

              {/* Edge Functions Health */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-xs font-medium text-muted-foreground">Functions</span>
                </div>
                <HealthGauge
                  value={data?.edgeFnAvgTime || 0}
                  maxValue={2000}
                  label="Exec Time"
                  unit="ms"
                  thresholds={{ good: 200, warning: 1000 }}
                  size="xs"
                />
                <div className="flex flex-wrap gap-1 mt-1.5 justify-center">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {data?.edgeFnCallCount || 0}/hr
                  </Badge>
                  {(data?.edgeFnErrorCount || 0) > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {data?.edgeFnErrorCount} err
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Errors Section */}
            {data?.recentErrors && data.recentErrors.length > 0 && (
              <Collapsible open={errorsOpen} onOpenChange={setErrorsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm">Recent Issues ({data.recentErrors.length})</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${errorsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {data.recentErrors.map((error, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm"
                    >
                      <Badge 
                        variant={error.severity === 'ERROR' ? 'destructive' : 'secondary'}
                        className="text-xs shrink-0"
                      >
                        {error.severity}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{error.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(error.timestamp), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
