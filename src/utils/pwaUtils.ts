/**
 * PWA utility functions for cache management and troubleshooting
 */

/**
 * Force-clear all PWA caches and unregister service workers.
 * Use this for troubleshooting when users are stuck on old versions.
 */
export async function clearAllCaches(): Promise<void> {
  console.log('[PWA] Starting cache clear...');

  try {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('[PWA] Found caches:', cacheNames);
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[PWA] Cleared all caches');
    }
  } catch (error) {
    console.error('[PWA] Error clearing caches:', error);
  }

  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('[PWA] Unregistered service workers');
    }
  } catch (error) {
    console.error('[PWA] Error unregistering service workers:', error);
  }

  // Always reload, even if clearing failed
  console.log('[PWA] Reloading page...');
  window.location.reload();
}

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
