import { 
  User, 
  FileText, 
  MessageSquare, 
  ShoppingCart, 
  Calendar, 
  Video, 
  Megaphone,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ActivityLog } from '@/hooks/useActivityLogs';

const ENTITY_CONFIG: Record<string, { icon: typeof User; colorClass: string; label: string }> = {
  user: { icon: User, colorClass: 'text-blue-500', label: 'User' },
  post: { icon: FileText, colorClass: 'text-green-500', label: 'Post' },
  comment: { icon: MessageSquare, colorClass: 'text-cyan-500', label: 'Comment' },
  order: { icon: ShoppingCart, colorClass: 'text-orange-500', label: 'Order' },
  event: { icon: Calendar, colorClass: 'text-purple-500', label: 'Event' },
  recording: { icon: Video, colorClass: 'text-red-500', label: 'Recording' },
  announcement: { icon: Megaphone, colorClass: 'text-yellow-500', label: 'Announcement' },
};

const ACTION_CONFIG: Record<string, { icon: typeof Plus; variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
  create: { icon: Plus, variant: 'default', label: 'Created' },
  update: { icon: Pencil, variant: 'secondary', label: 'Updated' },
  delete: { icon: Trash2, variant: 'destructive', label: 'Deleted' },
};

interface ActivityItemProps {
  log: ActivityLog;
}

export function ActivityItem({ log }: ActivityItemProps) {
  const entityConfig = ENTITY_CONFIG[log.entity_type] || ENTITY_CONFIG.user;
  const actionConfig = ACTION_CONFIG[log.action] || ACTION_CONFIG.create;
  
  const EntityIcon = entityConfig.icon;
  const ActionIcon = actionConfig.icon;

  const getDescription = () => {
    const actor = log.user_name || 'System';
    const entityTitle = log.entity_title || log.entity_id.slice(0, 8);
    
    switch (log.action) {
      case 'create':
        return `${actor} created ${entityConfig.label.toLowerCase()} "${entityTitle}"`;
      case 'update':
        return `${actor} updated ${entityConfig.label.toLowerCase()} "${entityTitle}"`;
      case 'delete':
        return `${actor} deleted ${entityConfig.label.toLowerCase()} "${entityTitle}"`;
      default:
        return `${actor} performed action on ${entityConfig.label.toLowerCase()}`;
    }
  };

  const getMetadataDetails = () => {
    if (!log.metadata) return null;
    
    const details: string[] = [];
    
    if (log.entity_type === 'user' && log.metadata.approval_changed) {
      details.push(log.metadata.is_approved ? '✓ Approved' : '⏳ Pending');
    }
    
    if (log.entity_type === 'order' && log.metadata.status) {
      details.push(`Status: ${log.metadata.status}`);
    }
    
    if (log.entity_type === 'event' && log.metadata.is_published !== undefined) {
      details.push(log.metadata.is_published ? 'Published' : 'Draft');
    }
    
    return details.length > 0 ? details.join(' • ') : null;
  };

  const metadataDetails = getMetadataDetails();

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Entity Icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
        "bg-muted"
      )}>
        <EntityIcon className={cn("h-5 w-5", entityConfig.colorClass)} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={actionConfig.variant} className="text-xs">
            <ActionIcon className="h-3 w-3 mr-1" />
            {actionConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
          </span>
        </div>
        
        <p className="text-sm mt-1 text-foreground truncate">
          {getDescription()}
        </p>
        
        {metadataDetails && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {metadataDetails}
          </p>
        )}
      </div>
    </div>
  );
}
