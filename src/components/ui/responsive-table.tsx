import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * A wrapper component that enables horizontal scrolling for tables on mobile
 * with visual scroll indicators and a synchronized top scrollbar for mouse users.
 */
export function ResponsiveTable({
  children,
  className,
  ...props
}: ResponsiveTableProps) {
  const topScrollbarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  
  // Flag to prevent infinite scroll loops
  const isScrollingSyncRef = useRef(false);

  // Check scroll position and update state
  const updateScrollState = useCallback(() => {
    if (!contentRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = contentRef.current;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    setHasOverflow(scrollWidth > clientWidth);
  }, []);

  // Sync scroll from top scrollbar to content
  const handleTopScroll = useCallback(() => {
    if (isScrollingSyncRef.current) return;
    if (contentRef.current && topScrollbarRef.current) {
      isScrollingSyncRef.current = true;
      contentRef.current.scrollLeft = topScrollbarRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false;
      });
    }
    updateScrollState();
  }, [updateScrollState]);

  // Sync scroll from content to top scrollbar
  const handleContentScroll = useCallback(() => {
    if (isScrollingSyncRef.current) return;
    if (contentRef.current && topScrollbarRef.current) {
      isScrollingSyncRef.current = true;
      topScrollbarRef.current.scrollLeft = contentRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false;
      });
    }
    updateScrollState();
  }, [updateScrollState]);

  // ResizeObserver for content width changes
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setContentWidth(width);
        updateScrollState();
      }
    });

    resizeObserver.observe(inner);
    
    // Initial measurement
    setContentWidth(inner.scrollWidth);
    updateScrollState();

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  // Also update on window resize
  useEffect(() => {
    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateScrollState]);

  return (
    <div className={cn('relative', className)} {...props}>
      {/* Top scrollbar - only visible when content overflows */}
      {hasOverflow && (
        <div 
          ref={topScrollbarRef}
          className="overflow-x-auto overflow-y-hidden h-3 mb-1"
          onScroll={handleTopScroll}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div style={{ width: contentWidth, height: 1 }} />
        </div>
      )}
      
      {/* Main content with shadows */}
      <div className="relative">
        {/* Left shadow indicator */}
        <div 
          className={cn(
            'absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10 transition-opacity duration-200',
            'bg-gradient-to-r from-foreground/20 via-foreground/10 to-transparent',
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          )} 
        />
        
        {/* Scrollable content */}
        <div
          ref={contentRef}
          className="w-full overflow-x-auto"
          onScroll={handleContentScroll}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div ref={innerRef} className="min-w-max">
            {children}
          </div>
        </div>
        
        {/* Right shadow indicator */}
        <div 
          className={cn(
            'absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10 transition-opacity duration-200',
            'bg-gradient-to-l from-foreground/20 via-foreground/10 to-transparent',
            canScrollRight ? 'opacity-100' : 'opacity-0'
          )} 
        />
      </div>
    </div>
  );
}
