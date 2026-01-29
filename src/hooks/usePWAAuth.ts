import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Detects if the app is running as an installed PWA (standalone mode)
 */
export function isRunningAsPWA(): boolean {
  // Check for standalone display mode (iOS and Android)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for iOS standalone mode
  if ((navigator as any).standalone === true) {
    return true;
  }
  
  // Check if running in TWA (Trusted Web Activity)
  if (document.referrer.includes('android-app://')) {
    return true;
  }
  
  return false;
}

/**
 * Hook that listens for auth session updates from external browser windows
 * Used when OAuth redirects happen outside the PWA
 */
export function usePWAAuthListener() {
  useEffect(() => {
    if (!isRunningAsPWA()) return;

    const handleStorageChange = async (event: StorageEvent) => {
      // Listen for auth session updates from the browser
      if (event.key === 'pwa-auth-session' && event.newValue) {
        try {
          const sessionData = JSON.parse(event.newValue);
          if (sessionData.access_token && sessionData.refresh_token) {
            // Set the session in Supabase
            await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token,
            });
            // Clean up
            localStorage.removeItem('pwa-auth-session');
            // Reload to trigger auth state change
            window.location.reload();
          }
        } catch (e) {
          console.error('Failed to parse PWA auth session:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check on focus in case the storage event was missed
    const handleFocus = () => {
      const sessionData = localStorage.getItem('pwa-auth-session');
      if (sessionData) {
        handleStorageChange({ key: 'pwa-auth-session', newValue: sessionData } as StorageEvent);
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
}

/**
 * Stores the auth session for PWA to pick up
 * Called from the auth callback page
 */
export function storePWAAuthSession(accessToken: string, refreshToken: string) {
  localStorage.setItem('pwa-auth-session', JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    timestamp: Date.now(),
  }));
}
