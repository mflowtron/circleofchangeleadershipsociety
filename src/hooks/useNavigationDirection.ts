import { useEffect, useState } from 'react';
import { useNavigationType } from 'react-router-dom';

export type NavigationDirection = 'forward' | 'back';

/**
 * Hook to detect navigation direction (forward vs back) for slide animations.
 * Uses react-router's navigation type to determine if this is a PUSH (forward) or POP (back).
 */
export function useNavigationDirection(): NavigationDirection {
  const navigationType = useNavigationType();
  const [direction, setDirection] = useState<NavigationDirection>('forward');

  useEffect(() => {
    // POP = back button, PUSH = forward navigation, REPLACE = treated as forward
    setDirection(navigationType === 'POP' ? 'back' : 'forward');
  }, [navigationType]);

  return direction;
}
