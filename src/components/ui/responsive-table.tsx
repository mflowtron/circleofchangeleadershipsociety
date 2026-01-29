import * as React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * A wrapper component that enables horizontal scrolling for tables on mobile
 * while maintaining internal scroll behavior and touch-friendly scrolling.
 */
export function ResponsiveTable({
  children,
  className,
  ...props
}: ResponsiveTableProps) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto -webkit-overflow-scrolling-touch',
        className
      )}
      style={{ WebkitOverflowScrolling: 'touch' }}
      {...props}
    >
      <div className="min-w-full inline-block align-middle">
        {children}
      </div>
    </div>
  );
}
