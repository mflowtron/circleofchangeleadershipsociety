

# Remove Unused Dependencies and Dead Code

## Summary

Clean up the codebase by removing unused UI components, npm packages, a hook, and a stale edge function. All items verified as truly unused - no imports or references exist anywhere in the application.

---

## Verification Results

| Item | Status |
|------|--------|
| 14 UI components | No imports found in any `.tsx` or `.ts` file |
| `useAttendeeBookmarks.ts` | Only self-references (never imported by other files) |
| `backfill-video-aspect-ratios/` | No references anywhere in codebase |
| 5 npm packages | Only imported by the UI components being deleted |

---

## Changes

### 1. Delete Unused UI Component Files (14 files)

Remove from `src/components/ui/`:

| File | Package Dependency |
|------|--------------------|
| `accordion.tsx` | radix (kept) |
| `breadcrumb.tsx` | radix (kept) |
| `carousel.tsx` | `embla-carousel-react` |
| `chart.tsx` | `recharts` |
| `context-menu.tsx` | radix (kept) |
| `drawer.tsx` | `vaul` |
| `hover-card.tsx` | radix (kept) |
| `input-otp.tsx` | `input-otp` |
| `menubar.tsx` | radix (kept) |
| `navigation-menu.tsx` | radix (kept) |
| `pagination.tsx` | none |
| `resizable.tsx` | `react-resizable-panels` |
| `sidebar.tsx` | none |
| `slider.tsx` | radix (kept) |

### 2. Remove Unused npm Packages (5 packages)

Remove from `package.json` dependencies:

- `embla-carousel-react` - only used by `carousel.tsx`
- `input-otp` - only used by `input-otp.tsx`
- `react-resizable-panels` - only used by `resizable.tsx`
- `recharts` - only used by `chart.tsx`
- `vaul` - only used by `drawer.tsx`

### 3. Delete Unused Hook

Remove `src/hooks/useAttendeeBookmarks.ts` - a wrapper hook that is never imported anywhere.

### 4. Delete Stale Edge Function

Remove entire directory `supabase/functions/backfill-video-aspect-ratios/` - one-time migration script no longer needed.

---

## Preserved Items

| Item | Reason |
|------|--------|
| `toggle.tsx` | Imported by `toggle-group.tsx` |
| `command.tsx` | Used by `SpeakerSelector.tsx` |
| `cmdk` package | Required by `command.tsx` |
| `natively` package | App will be wrapped as native app |

---

## Technical Notes

### File Deletions

```text
src/components/ui/
├── accordion.tsx      ← DELETE
├── breadcrumb.tsx     ← DELETE
├── carousel.tsx       ← DELETE
├── chart.tsx          ← DELETE
├── context-menu.tsx   ← DELETE
├── drawer.tsx         ← DELETE
├── hover-card.tsx     ← DELETE
├── input-otp.tsx      ← DELETE
├── menubar.tsx        ← DELETE
├── navigation-menu.tsx ← DELETE
├── pagination.tsx     ← DELETE
├── resizable.tsx      ← DELETE
├── sidebar.tsx        ← DELETE
└── slider.tsx         ← DELETE

src/hooks/
└── useAttendeeBookmarks.ts ← DELETE

supabase/functions/
└── backfill-video-aspect-ratios/ ← DELETE (entire directory)
```

### Package.json Changes

```json
{
  "dependencies": {
    // REMOVE these 5 lines:
    "embla-carousel-react": "^8.6.0",
    "input-otp": "^1.4.2",
    "react-resizable-panels": "^2.1.9",
    "recharts": "^2.15.4",
    "vaul": "^0.9.9"
  }
}
```

---

## Result

After cleanup:
- 14 fewer UI component files
- 5 fewer npm dependencies (smaller bundle size)
- 1 fewer unused hook
- 1 fewer stale edge function

The app will build and function identically with no behavioral changes.

