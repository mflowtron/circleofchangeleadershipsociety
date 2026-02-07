import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useNavigationDirection } from '@/hooks/useNavigationDirection';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  direction?: 'forward' | 'back';
}

/**
 * Wrapper component that applies slide transitions based on navigation direction.
 * Uses CSS animations with motion-safe for accessibility.
 */
export function PageTransition({ children, className, direction: overrideDirection }: PageTransitionProps) {
  const navDirection = useNavigationDirection();
  const direction = overrideDirection ?? navDirection;

  return (
    <div
      className={cn(
        'h-full',
        // Apply animation based on direction, respecting reduced motion
        direction === 'forward' 
          ? 'motion-safe:animate-slide-in-from-right'
          : 'motion-safe:animate-slide-in-from-left',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Simple fade transition for less prominent navigations
 */
export function FadeTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('motion-safe:animate-fade-in', className)}>
      {children}
    </div>
  );
}
