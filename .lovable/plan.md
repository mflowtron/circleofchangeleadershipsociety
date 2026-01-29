

# Improve PWA Cache Update Speed

## Current Setup Analysis

The current PWA configuration includes:
- **autoUpdate** register type with `skipWaiting: true` and `clientsClaim: true`
- 5-minute polling interval for checking updates
- A manual refresh banner when updates are detected
- NetworkFirst strategy for navigation and API calls

## Why Updates Feel Slow

Despite having `skipWaiting` and `clientsClaim`, users still experience stale content because:

1. **Manual refresh required** - The current flow shows a banner and waits for user action
2. **5-minute polling interval** - Users may not see updates for up to 5 minutes
3. **Cached JavaScript bundles** - Old JS files are served from precache until the service worker updates
4. **iOS Safari limitations** - iOS handles PWA updates differently and may require app restart

## Solution: Aggressive Auto-Update Strategy

### Changes Overview

| File | Change |
|------|--------|
| `vite.config.ts` | Add cache-busting headers hint and network-first for JS/CSS |
| `UpdateNotification.tsx` | Auto-reload after short delay, add "Update now" visual, reduce poll to 1 minute |
| New: `src/utils/pwaUtils.ts` | Helper to force clear caches on critical updates |

### 1. Update Vite Config - Add Runtime Caching for JS/CSS

Add a network-first strategy for JavaScript and CSS files to ensure fresh code is always fetched:

```typescript
// Add to runtimeCaching array
{
  urlPattern: /\.(?:js|css)$/i,
  handler: "NetworkFirst",
  options: {
    cacheName: "static-resources",
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 60 * 60 * 24, // 1 day
    },
    networkTimeoutSeconds: 3, // Fall back to cache if network is slow
  },
},
```

### 2. Update the Notification Component - Auto-Reload Option

Transform the update notification to auto-reload after a brief countdown, giving users a heads up but not requiring action:

- Reduce polling from 5 minutes to **1 minute**
- Show a 5-second countdown before auto-refresh
- Add option to dismiss and refresh manually later
- Check for updates immediately on page visibility change (when user returns to app)

### 3. Add Page Visibility Listener

When users switch back to the PWA, immediately check for updates rather than waiting for the next poll:

```typescript
// In UpdateNotification.tsx
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && registration) {
      registration.update();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [registration]);
```

### 4. Create PWA Utility for Manual Cache Clear

Add a utility function users can trigger from settings to force-clear all PWA caches:

```typescript
// src/utils/pwaUtils.ts
export async function clearAllCaches(): Promise<void> {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
  }
  // Unregister and re-register service worker
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }
  window.location.reload();
}
```

## Updated User Flow

```text
┌─────────────────────────────────────────┐
│  User opens PWA                         │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Check for SW update immediately        │
│  + poll every 1 minute                  │
│  + check on visibility change           │
└─────────────────────────────────────────┘
         │
         │ Update detected
         ▼
┌─────────────────────────────────────────┐
│  Show banner with 5s countdown          │
│  "Updating in 5... 4... 3..."           │
│  [Update Now] [Dismiss]                 │
└─────────────────────────────────────────┘
         │
         │ Countdown ends OR user clicks
         ▼
┌─────────────────────────────────────────┐
│  Auto-reload with new version           │
└─────────────────────────────────────────┘
```

## Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| Update detection | 5 minutes max | 1 minute max |
| Detection on app resume | Not checked | Immediate check |
| User action required | Yes (manual) | No (auto after 5s) |
| JS/CSS freshness | Precache only | Network-first |

## Technical Details

### Files to Modify
1. **vite.config.ts** - Add JS/CSS runtime caching strategy
2. **src/components/pwa/UpdateNotification.tsx** - Add auto-reload countdown, visibility listener, reduce poll interval
3. **New: src/utils/pwaUtils.ts** - Cache clearing utility for troubleshooting

### Implementation Notes
- The auto-reload countdown can be dismissed if user is in the middle of something
- Visibility change listener ensures instant update check when returning to app
- Network-first for JS/CSS means fresh code is always attempted first, with cache fallback for offline

