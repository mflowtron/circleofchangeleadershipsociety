

# Fix: Natively Previewer Blank Screen

## Problem Identified

The app shows a blank white screen in the Natively previewer because the `NativelyInfo` class instantiation and `browserInfo()` method calls can throw errors when the Natively SDK isn't fully initialized. Since these calls happen during the React component lifecycle without try-catch blocks, any error crashes the entire React app.

**Affected files:**
- `src/hooks/useNativelyThemeSync.ts` - No error handling around `NativelyInfo` calls
- `src/components/NativelySafeAreaProvider.tsx` - No error handling around `NativelyInfo` calls

## Solution

Wrap all Natively SDK calls in try-catch blocks to gracefully handle any initialization errors. This ensures the app continues to function even if the SDK isn't ready or throws an error.

---

## File Changes

### 1. Update `src/hooks/useNativelyThemeSync.ts`

Add try-catch around the entire SDK interaction:

```typescript
'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { NativelyInfo } from 'natively';

export function useNativelyThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    try {
      const info = new NativelyInfo();
      if (!info.browserInfo().isNativeApp) return;
      if (!resolvedTheme) return;

      const natively = (window as any).natively;
      if (!natively) return;

      if (resolvedTheme === 'dark') {
        natively.setAppStatusBarStyleIOS('LIGHT');
        natively.setAppBackgroundColor('#161412');
      } else {
        natively.setAppStatusBarStyleIOS('DARK');
        natively.setAppBackgroundColor('#F9F8F5');
      }
    } catch (error) {
      // Silently fail - SDK not ready or not in native environment
      console.debug('Natively theme sync skipped:', error);
    }
  }, [resolvedTheme]);
}
```

### 2. Update `src/components/NativelySafeAreaProvider.tsx`

Add try-catch around SDK initialization:

```typescript
'use client';

import { useEffect } from 'react';
import { NativelyInfo } from 'natively';

interface NativelyInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function NativelySafeAreaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const info = new NativelyInfo();
      const browserInfo = info.browserInfo();

      if (!browserInfo.isNativeApp) return;

      document.documentElement.classList.add('is-natively-app');

      if (typeof window !== 'undefined' && 'natively' in window) {
        (window as any).natively.getInsets((resp: NativelyInsets) => {
          document.documentElement.style.setProperty('--natively-inset-top', `${resp.top}px`);
          document.documentElement.style.setProperty('--natively-inset-right', `${resp.right}px`);
          document.documentElement.style.setProperty('--natively-inset-bottom', `${resp.bottom}px`);
          document.documentElement.style.setProperty('--natively-inset-left', `${resp.left}px`);
        });
      }

      return () => {
        document.documentElement.classList.remove('is-natively-app');
      };
    } catch (error) {
      // Silently fail - SDK not ready or not in native environment
      console.debug('Natively safe area provider skipped:', error);
    }
  }, []);

  return <>{children}</>;
}
```

---

## Why This Fixes the Issue

1. **Graceful degradation**: If the Natively SDK throws any error during initialization, the app continues to render normally
2. **No visual impact**: The app falls back to standard browser behavior (CSS `env()` safe areas, default status bar)
3. **Debug logging**: Errors are logged to console for debugging without crashing the app
4. **Web compatibility preserved**: The try-catch has no effect on the regular web version since the early return still happens for non-native apps

---

## Testing After Fix

1. **Natively Previewer**: App should load and display content instead of blank screen
2. **Web Browser**: No change in behavior - app works normally
3. **Actual Native App**: Safe areas and theme sync should still work when SDK is properly initialized

