/**
 * PWA utility functions for service worker management
 */

/**
 * Check if there's a waiting service worker and activate it immediately
 */
export async function forceUpdateServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.waiting) {
    // Tell the waiting service worker to activate
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
  }

  return false;
}

/**
 * Get the current service worker status for debugging
 */
export async function getServiceWorkerStatus(): Promise<{
  hasController: boolean;
  hasWaiting: boolean;
  hasInstalling: boolean;
  cacheNames: string[];
}> {
  const status = {
    hasController: false,
    hasWaiting: false,
    hasInstalling: false,
    cacheNames: [] as string[],
  };

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    status.hasController = !!navigator.serviceWorker.controller;
    status.hasWaiting = !!registration?.waiting;
    status.hasInstalling = !!registration?.installing;
  }

  if ('caches' in window) {
    status.cacheNames = await caches.keys();
  }

  return status;
}
