import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ClickableUserAvatarProps {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showAvatar?: boolean;
  nameClassName?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
};

export function ClickableUserAvatar({
  userId,
  fullName,
  avatarUrl,
  size = 'md',
  showName = false,
  showAvatar = true,
  nameClassName,
  className,
}: ClickableUserAvatarProps) {
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const avatarElement = (
    <Avatar className={cn(sizeClasses[size], 'ring-2 ring-primary/10 transition-transform hover:scale-105', className)}>
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback className={cn('bg-primary text-primary-foreground font-semibold', textSizeClasses[size])}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (showName) {
    return (
      <Link 
        to={`/profile/${userId}`} 
        className="flex items-center gap-3 group"
      >
        {showAvatar && avatarElement}
        <span className={cn(
          'font-semibold text-foreground group-hover:underline',
          nameClassName
        )}>
          {fullName}
        </span>
      </Link>
    );
  }

  if (!showAvatar) {
    return null;
  }

  return (
    <Link to={`/profile/${userId}`}>
      {avatarElement}
    </Link>
  );
}
