import { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import type MuxPlayerElement from '@mux/mux-player';
import { cn } from '@/lib/utils';

type MuxPlayerProps = React.ComponentProps<typeof MuxPlayer>;

interface MuxPlayerWithFixProps extends MuxPlayerProps {
  /** Additional className for the player */
  className?: string;
}

/**
 * A MuxPlayer wrapper that automatically applies the iOS fullscreen scroll fix.
 * Use this component instead of MuxPlayer directly to ensure consistent behavior
 * across the app when exiting fullscreen in Natively WebViews.
 */
const MuxPlayerWithFix = forwardRef<MuxPlayerElement, MuxPlayerWithFixProps>(
  ({ className, ...props }, ref) => {
    const internalRef = useRef<MuxPlayerElement | null>(null);

    // Combine internal ref with forwarded ref
    const handleRef = useCallback((el: MuxPlayerElement | null) => {
      internalRef.current = el;
    }, []);

    // Expose the internal ref to parent via forwardRef
    useImperativeHandle(ref, () => internalRef.current!, []);

    return (
      <MuxPlayer
        ref={handleRef}
        className={cn(className)}
        {...props}
      />
    );
  }
);

MuxPlayerWithFix.displayName = 'MuxPlayerWithFix';

export default MuxPlayerWithFix;
