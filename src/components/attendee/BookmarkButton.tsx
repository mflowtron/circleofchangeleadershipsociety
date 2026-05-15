import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => Promise<void>;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function BookmarkButton({ 
  isBookmarked, 
  onToggle, 
  size = 'default',
  className,
}: BookmarkButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsAnimating(true);
    
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    await onToggle();
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        sizeClasses[size],
        "rounded-full transition-all duration-200",
        isBookmarked && "text-primary",
        isAnimating && "scale-125",
        className
      )}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <Bookmark 
        className={cn(
          iconSizes[size],
          "transition-all duration-200",
          isBookmarked && "fill-current"
        )} 
      />
    </Button>
  );
}
