

# Optimize Service Worker for Natively Native App

## Overview

Your app already has a well-configured service worker via `vite-plugin-pwa` with Workbox. This same service worker will work inside Natively's native wrapper. The plan is to:

1. **Optimize caching strategies** for better native app performance
2. **Add Natively-aware caching logic** that uses more aggressive caching when running inside the native app
3. **Enable offline support** for key screens
4. **Update Natively dashboard settings** (manual step)

---

## Current State

Your Workbox config already includes:
- NetworkFirst for JS/CSS (3-second timeout)
- NetworkFirst for Supabase API calls
- NetworkFirst for page navigations
- Precaching of static assets up to 3MB

This is good for a PWA in the browser, but native apps can benefit from:
- More aggressive CacheFirst strategies (native apps are usually "installed" longer)
- Caching of user avatars and event images
- Offline fallback pages

---

## Implementation Plan

### Part 1: Enhanced Runtime Caching for Native Context

**File: `vite.config.ts`**

Add additional runtime caching rules optimized for the native app:

```typescript
runtimeCaching: [
  // ... existing rules ...
  
  // Cache images aggressively (avatars, event images)
  {
    urlPattern: /\.(?:png|jpg|jpeg|webp|gif|svg)$/i,
    handler: "CacheFirst",
    options: {
      cacheName: "images-cache",
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      },
    },
  },
  
  // Cache fonts permanently
  {
    urlPattern: /\.(?:woff|woff2|ttf|otf)$/i,
    handler: "CacheFirst",
    options: {
      cacheName: "fonts-cache",
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      },
    },
  },
  
  // Cache Mux video thumbnails
  {
    urlPattern: /^https:\/\/image\.mux\.com\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "mux-thumbnails",
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      },
    },
  },
  
  // Cache Supabase storage files (avatars, attachments)
  {
    urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "supabase-storage",
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      },
    },
  },
]
```

### Part 2: Create Offline Fallback Page

**File: `public/offline.html`** (new)

A simple offline page that shows when no cached content is available:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Circle of Change - Offline</title>
  <style>
    /* Minimal offline UI styling */
  </style>
</head>
<body>
  <div class="container">
    <img src="/coclc-logo-emblem.png" alt="Circle of Change" />
    <h1>You're Offline</h1>
    <p>Check your internet connection and try again.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>
```

### Part 3: Add Offline Fallback to Workbox Config

**File: `vite.config.ts`**

Add navigateFallback for offline support:

```typescript
workbox: {
  // ... existing config ...
  navigateFallback: '/offline.html',
  navigateFallbackDenylist: [
    /^\/api\//,
    /^\/auth\//,
  ],
}
```

### Part 4: Natively-Aware Caching Helper

**File: `src/utils/nativelyCache.ts`** (new)

Create utilities to detect native context and manage caching accordingly:

```typescript
import { NativelyInfo } from 'natively';

/**
 * Check if running inside Natively native app
 */
export function isNativeApp(): boolean {
  try {
    const info = new NativelyInfo();
    return info.browserInfo().isNativeApp;
  } catch {
    return false;
  }
}

/**
 * Warm up critical caches when app launches in native context
 */
export async function warmNativeCache(): Promise<void> {
  if (!isNativeApp()) return;
  
  // Prefetch critical routes
  const criticalRoutes = [
    '/',
    '/attendee',
    '/offline.html',
  ];
  
  const cache = await caches.open('pages-cache');
  for (const route of criticalRoutes) {
    try {
      await cache.add(route);
    } catch {
      // Ignore failures
    }
  }
}
```

### Part 5: Initialize Native Cache Warming

**File: `src/main.tsx`**

Call cache warming on app startup:

```typescript
import { warmNativeCache } from './utils/nativelyCache';

// Warm cache in background after render
warmNativeCache().catch(console.debug);

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <UpdateNotification />
  </>
);
```

---

## Manual Steps Required (Natively Dashboard)

After deployment, you'll need to configure Natively:

1. **Open Natively Dashboard** → Features
2. **Enable Service Worker**
3. **Add Trusted Hosts**:
   - `circleofchangeleadershipsociety.lovable.app`
   - `ghwyhwcmhemeeixwbfgp.supabase.co`
   - `image.mux.com` (for video thumbnails)
4. **Disable Continuous Network Check** (to allow offline access)
5. **Save and Rebuild** the native app

---

## Files to Create/Modify

| File | Type | Changes |
|------|------|---------|
| `vite.config.ts` | Modify | Add image/font/Mux caching rules, offline fallback |
| `public/offline.html` | Create | Offline fallback page |
| `src/utils/nativelyCache.ts` | Create | Native detection and cache warming utilities |
| `src/main.tsx` | Modify | Call cache warming on startup |

---

## Performance Impact

| Scenario | Before | After |
|----------|--------|-------|
| Image loading (avatars, events) | Network every time | Cached for 30 days |
| Fonts | Network every time | Cached for 1 year |
| Mux thumbnails | Network every time | Cached for 7 days |
| Supabase storage files | Network every time | Stale-while-revalidate |
| Offline navigation | White screen | Branded offline page |
| App cold start (native) | Load all assets | Critical routes pre-cached |

---

## Technical Notes

### Why CacheFirst for Images?

In a native app context, users expect content to load instantly. Images rarely change (user avatars, event banners), so caching them aggressively improves perceived performance significantly.

### Stale-While-Revalidate for Storage

For Supabase storage files (attachments, uploaded images), we show cached content immediately while fetching fresh content in the background. This balances speed with freshness.

### Offline Fallback

The offline.html page is a lightweight fallback when:
- User is offline AND
- No cached version of the requested page exists

This prevents the jarring "no internet" browser error.

