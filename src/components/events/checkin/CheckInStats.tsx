import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, Percent, Loader2 } from 'lucide-react';
import { useCheckInStats } from '@/hooks/useCheckins';
import { format } from 'date-fns';

interface CheckInStatsProps {
  eventId: string;
  date?: string;
}

export function CheckInStats({ eventId, date = format(new Date(), 'yyyy-MM-dd') }: CheckInStatsProps) {
  const { data: stats, isLoading } = useCheckInStats(eventId, date);

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  const { total = 0, checkedIn = 0, percentage = 0, byTicketType = {} } = stats || {};

  return (
    <div className="space-y-4">
      {/* Main stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Checked In</p>
                <p className="text-2xl font-bold text-green-600">{checkedIn}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Percent className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold text-blue-600">{percentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Check-in Progress</span>
              <span className="font-medium">{checkedIn} / {total}</span>
            </div>
            <Progress value={percentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* By ticket type */}
      {Object.keys(byTicketType).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">By Ticket Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byTicketType).map(([typeName, data]) => {
              const typePercentage = data.total > 0 ? Math.round((data.checkedIn / data.total) * 100) : 0;
              return (
                <div key={typeName} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{typeName}</span>
                    <span className="text-muted-foreground">
                      {data.checkedIn}/{data.total}
                    </span>
                  </div>
                  <Progress value={typePercentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
