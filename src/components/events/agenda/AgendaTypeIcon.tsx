import { 
  Presentation, 
  Coffee, 
  Utensils, 
  Users, 
  Calendar 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgendaItemType } from '@/hooks/useAgendaItems';

const ITEM_TYPE_CONFIG: Record<AgendaItemType, { 
  label: string; 
  icon: typeof Presentation; 
  bgClass: string;
  textClass: string;
}> = {
  session: { 
    label: 'Session', 
    icon: Presentation, 
    bgClass: 'bg-primary/10',
    textClass: 'text-primary',
  },
  break: { 
    label: 'Break', 
    icon: Coffee, 
    bgClass: 'bg-muted',
    textClass: 'text-muted-foreground',
  },
  meal: { 
    label: 'Meal', 
    icon: Utensils, 
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-600 dark:text-orange-400',
  },
  networking: { 
    label: 'Networking', 
    icon: Users, 
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-600 dark:text-green-400',
  },
  other: { 
    label: 'Other', 
    icon: Calendar, 
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-600 dark:text-purple-400',
  },
};

interface AgendaTypeIconProps {
  type: AgendaItemType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function AgendaTypeIcon({ 
  type, 
  size = 'md', 
  showLabel = false,
  className 
}: AgendaTypeIconProps) {
  const config = ITEM_TYPE_CONFIG[type] || ITEM_TYPE_CONFIG.other;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const containerSizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'rounded-md',
        config.bgClass,
        containerSizeClasses[size]
      )}>
        <Icon className={cn(sizeClasses[size], config.textClass)} />
      </div>
      {showLabel && (
        <span className={cn('text-sm font-medium', config.textClass)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

export function getAgendaTypeConfig(type: AgendaItemType) {
  return ITEM_TYPE_CONFIG[type] || ITEM_TYPE_CONFIG.other;
}

export const AGENDA_ITEM_TYPES: AgendaItemType[] = ['session', 'break', 'meal', 'networking', 'other'];
