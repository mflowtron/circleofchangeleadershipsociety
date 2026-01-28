import { cn } from '@/lib/utils';

interface CircleLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  text?: string;
  className?: string;
}

export function CircleLoader({ 
  size = 'md', 
  showText = false, 
  text = 'Loading...',
  className 
}: CircleLoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const ringThickness = {
    sm: 'border-2',
    md: 'border-[3px]',
    lg: 'border-4',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      {/* Animated rings container */}
      <div className={cn("relative", sizeClasses[size])}>
        {/* Outer ring - slow rotation */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full border-primary/20",
            ringThickness[size]
          )}
          style={{
            animation: 'spin 3s linear infinite',
            borderTopColor: 'hsl(var(--primary))',
            borderRightColor: 'transparent',
          }}
        />
        
        {/* Middle ring - medium rotation, opposite direction */}
        <div 
          className={cn(
            "absolute rounded-full border-primary/30",
            ringThickness[size],
            size === 'sm' ? 'inset-1' : size === 'md' ? 'inset-2' : 'inset-3'
          )}
          style={{
            animation: 'spin 2s linear infinite reverse',
            borderBottomColor: 'hsl(var(--primary) / 0.7)',
            borderLeftColor: 'transparent',
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
          }}
        />
        
        {/* Inner ring - fast rotation */}
        <div 
          className={cn(
            "absolute rounded-full border-primary/40",
            ringThickness[size],
            size === 'sm' ? 'inset-2' : size === 'md' ? 'inset-4' : 'inset-6'
          )}
          style={{
            animation: 'spin 1.5s linear infinite',
            borderTopColor: 'hsl(var(--primary))',
            borderRightColor: 'hsl(var(--primary) / 0.5)',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
          }}
        />

        {/* Center dot - pulsing */}
        <div 
          className={cn(
            "absolute rounded-full bg-primary",
            size === 'sm' ? 'inset-3' : size === 'md' ? 'inset-6' : 'inset-9'
          )}
          style={{
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Text */}
      {showText && (
        <p className="text-muted-foreground text-sm font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// Full page loader variant
export function FullPageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <CircleLoader size="lg" />
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Circle of Change</h2>
          <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
        </div>
      </div>
    </div>
  );
}

export default CircleLoader;
