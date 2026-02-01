import { useEffect, useState, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

const POLL_INTERVAL = 60 * 1000; // 1 minute
const AUTO_RELOAD_DELAY = 5; // 5 seconds countdown

export function UpdateNotification() {
  const [showBanner, setShowBanner] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_RELOAD_DELAY);
  const [isPaused, setIsPaused] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      registrationRef.current = registration || null;
      
      // Check for updates every 1 minute
      if (registration) {
        setInterval(() => {
          registration.update();
        }, POLL_INTERVAL);
        
        // Also check immediately on registration
        registration.update();
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  // Check for updates when page becomes visible (user returns to app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && registrationRef.current) {
        console.log('[PWA] Page visible, checking for updates...');
        registrationRef.current.update();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Show banner when update is available
  useEffect(() => {
    if (needRefresh) {
      setShowBanner(true);
      setCountdown(AUTO_RELOAD_DELAY);
      setIsPaused(false);
    }
  }, [needRefresh]);

  // Auto-reload countdown
  useEffect(() => {
    if (!showBanner || isPaused || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Countdown finished, trigger update
          updateServiceWorker(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showBanner, isPaused, countdown, updateServiceWorker]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setIsPaused(true);
    setShowBanner(false);
    setNeedRefresh(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300" style={{ bottom: '1rem', left: '1rem', right: '1rem' }}>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Update Available</span>
            <span className="text-xs text-muted-foreground">
              {isPaused 
                ? 'Tap to update now'
                : `Updating in ${countdown}s...`
              }
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleUpdate}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Update
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
