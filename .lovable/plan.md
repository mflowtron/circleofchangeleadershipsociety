

# Remove Offline Fallback Page

## Problem

The `navigateFallback: '/offline.html'` Workbox configuration incorrectly shows the "You're Offline" page when:
- Network is slow but not offline
- There's a momentary connectivity hiccup
- The 3-second network timeout is exceeded

This creates a frustrating UX where users see "You're Offline" when they're actually online.

---

## Solution

Remove the offline fallback functionality entirely:
1. Remove `navigateFallback` and `navigateFallbackDenylist` from Workbox config
2. Delete the `public/offline.html` file
3. Remove `/offline.html` from the cache warming list

The app will continue to function normally - if the user is truly offline, they'll see the browser's default offline behavior or cached content (which is already handled by the existing caching strategies).

---

## Changes

### File: `vite.config.ts`

Remove these lines from the workbox config:

```typescript
// Remove these lines (59-64):
navigateFallback: '/offline.html',
navigateFallbackDenylist: [
  /^\/api\//,
  /^\/auth\//,
],
```

### File: `public/offline.html`

Delete this file entirely.

### File: `src/utils/nativelyCache.ts`

Remove `/offline.html` from the critical routes list:

```typescript
// Change from:
const criticalRoutes = [
  '/',
  '/attendee',
  '/offline.html',  // Remove this
];

// To:
const criticalRoutes = [
  '/',
  '/attendee',
];
```

---

## Files to Modify

| File | Action |
|------|--------|
| `vite.config.ts` | Remove `navigateFallback` and `navigateFallbackDenylist` |
| `public/offline.html` | Delete |
| `src/utils/nativelyCache.ts` | Remove `/offline.html` from cache warming |

---

## Result

After this change:
- No more false "You're Offline" pages
- Cached content still loads when truly offline (via existing runtime caching)
- Browser shows its native offline UI only when truly disconnected

