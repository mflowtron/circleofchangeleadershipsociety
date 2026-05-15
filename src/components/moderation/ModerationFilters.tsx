import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Flag, FileText } from 'lucide-react';
import type { FilterTab } from '@/hooks/useModerationPosts';

interface ModerationFiltersProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  stats: {
    total: number;
    flagged: number;
    pending: number;
    approved: number;
  };
}

export function ModerationFilters({ activeTab, onTabChange, stats }: ModerationFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Posts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Flag className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.flagged}</p>
              <p className="text-xs text-muted-foreground">Flagged</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-500">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as FilterTab)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All Posts
            <Badge variant="secondary" className="ml-1">{stats.total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="flagged" className="flex items-center gap-2">
            Flagged
            {stats.flagged > 0 && (
              <Badge variant="destructive" className="ml-1">{stats.flagged}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending
            {stats.pending > 0 && (
              <Badge variant="outline" className="ml-1 border-amber-500 text-amber-500">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
