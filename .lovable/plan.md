
# Remove PWA Install Prompt

## Summary

Remove the PWA install banner that prompts users to install the app to their home screen. This includes the banner component, its associated hook, and the usage in the app layout.

---

## Files to Modify/Delete

### 1. Delete: `src/components/pwa/InstallBanner.tsx`

Remove the entire component file - it's no longer needed.

### 2. Delete: `src/hooks/usePWAInstall.ts`

Remove the hook that manages PWA install prompt state - it's only used by InstallBanner.

### 3. Modify: `src/components/layout/AppLayout.tsx`

Remove the import and usage of InstallBanner:

**Line 6** - Remove the import:
```tsx
// DELETE THIS LINE:
import InstallBanner from '@/components/pwa/InstallBanner';
```

**Line 46** - Remove the component usage:
```tsx
// DELETE THIS LINE:
<InstallBanner />
```

---

## Files Summary

| Action | File |
|--------|------|
| Delete | `src/components/pwa/InstallBanner.tsx` |
| Delete | `src/hooks/usePWAInstall.ts` |
| Modify | `src/components/layout/AppLayout.tsx` |

---

## What Remains

The following PWA-related files will remain intact (they handle other functionality):
- `src/components/pwa/UpdateNotification.tsx` - Shows update notifications when new app version is available
- `src/utils/pwaUtils.ts` - Cache clearing utilities used by the Profile page
- `vite.config.ts` - PWA configuration (the app still works as a PWA, just without the install prompt)

The app will still function as a PWA - users can still add it to their home screen manually through their browser's native "Add to Home Screen" option if they wish.
